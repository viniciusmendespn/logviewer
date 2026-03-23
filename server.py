import gzip
import json
import os
import re
import subprocess
import sys
from flask import Flask, jsonify, send_from_directory, request

app = Flask(__name__, static_folder="viewer", static_url_path="")

LOGS_DIR = os.path.join(os.path.dirname(__file__), "logs")
S3_BUCKET = "s3://chat-banco-hyundai-log"


def read_log_file(path):
    with gzip.open(path, "rb") as fh:
        return json.loads(fh.read().decode("utf-8"))


def get_gz_files(directory):
    return sorted(
        f for f in os.listdir(directory) if f.endswith(".gz")
    )


def is_new_structure(session_dir):
    """Return True if sessionId dir contains messageId= subdirs."""
    try:
        first = next(
            e for e in os.listdir(session_dir)
            if os.path.isdir(os.path.join(session_dir, e))
        )
        return first.startswith("messageId=")
    except StopIteration:
        return False


def collect_session_files(session_dir):
    """Return sorted list of .gz file paths for a session."""
    if is_new_structure(session_dir):
        files = []
        for msg_dir in sorted(os.listdir(session_dir)):
            msg_path = os.path.join(session_dir, msg_dir)
            if not os.path.isdir(msg_path) or not msg_dir.startswith("messageId="):
                continue
            for fname in get_gz_files(msg_path):
                files.append(os.path.join(msg_path, fname))
        return files
    else:
        return [
            os.path.join(session_dir, f)
            for f in get_gz_files(session_dir)
        ]


@app.route("/api/sessions")
def api_sessions():
    dates = []
    for date_dir in sorted(os.listdir(LOGS_DIR), reverse=True):
        if not date_dir.startswith("date="):
            continue
        date_val = date_dir[len("date="):]
        date_path = os.path.join(LOGS_DIR, date_dir)
        sessions = []
        for session_dir in sorted(os.listdir(date_path)):
            if not session_dir.startswith("sessionId="):
                continue
            session_id = session_dir[len("sessionId="):]
            session_path = os.path.join(date_path, session_dir)
            files = collect_session_files(session_path)
            valid_files = []
            first_ts = None
            for f in files:
                try:
                    data = read_log_file(f)
                    valid_files.append(f)
                    ts = data.get("timestamps", {}).get("start_iso") or data.get("timestamps", {}).get("end_iso")
                    if ts and first_ts is None:
                        first_ts = ts
                except Exception as e:
                    print(f"[WARN] skipping {f}: {e}", file=sys.stderr)
            if valid_files:
                sessions.append({
                    "sessionId": session_id,
                    "messageCount": len(valid_files),
                    "firstTimestamp": first_ts,
                    "date": date_val,
                })
        if sessions:
            sessions.sort(key=lambda s: s["firstTimestamp"] or "", reverse=True)
            dates.append({"date": date_val, "sessions": sessions})
    return jsonify({"dates": dates})


@app.route("/api/session/<session_id>")
def api_session(session_id):
    date = request.args.get("date")
    if not date:
        return jsonify({"error": "date param required"}), 400

    date_path = os.path.join(LOGS_DIR, f"date={date}")
    session_path = os.path.join(date_path, f"sessionId={session_id}")

    if not os.path.isdir(session_path):
        return jsonify({"error": "session not found"}), 404

    files = collect_session_files(session_path)
    messages = []
    for f in files:
        try:
            data = read_log_file(f)
            messages.append(data)
        except Exception as e:
            print(f"[WARN] skipping {f}: {e}", file=sys.stderr)

    return jsonify({"messages": messages})


@app.route("/api/version")
def api_version():
    root = os.path.dirname(__file__)
    try:
        with open(os.path.join(root, "VERSION")) as f:
            version = f.read().strip()
    except Exception:
        version = "?"
    try:
        commit = subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=root, stderr=subprocess.DEVNULL
        ).decode().strip()
    except Exception:
        commit = None
    return jsonify({"version": version, "commit": commit})


@app.route("/api/search")
def api_search():
    q = request.args.get("q", "").strip().lower()
    if len(q) < 2:
        return jsonify({"results": [], "truncated": False})

    results = []
    MAX = 60

    for date_dir in sorted(os.listdir(LOGS_DIR), reverse=True):
        if not date_dir.startswith("date="):
            continue
        date_val = date_dir[len("date="):]
        date_path = os.path.join(LOGS_DIR, date_dir)

        for session_dir in sorted(os.listdir(date_path)):
            if not session_dir.startswith("sessionId="):
                continue
            session_id = session_dir[len("sessionId="):]
            session_path = os.path.join(date_path, session_dir)
            files = collect_session_files(session_path)

            for msg_idx, f in enumerate(files):
                try:
                    data = read_log_file(f)
                    req_text = (data.get("request") or {}).get("text") or ""
                    resp_text = (data.get("response") or {}).get("text") or ""
                    ts = (data.get("timestamps") or {}).get("start_iso")

                    for field, text in [("request", req_text), ("response", resp_text)]:
                        pos = text.lower().find(q)
                        if pos == -1:
                            continue
                        start = max(0, pos - 70)
                        end = min(len(text), pos + len(q) + 70)
                        snippet = (
                            ("…" if start > 0 else "")
                            + text[start:end]
                            + ("…" if end < len(text) else "")
                        )
                        results.append({
                            "date": date_val,
                            "sessionId": session_id,
                            "msgIndex": msg_idx,
                            "field": field,
                            "snippet": snippet,
                            "ts": ts,
                        })
                        if len(results) >= MAX:
                            return jsonify({"results": results, "truncated": True})
                        break  # só retorna 1 match por mensagem (o primeiro campo que bate)
                except Exception:
                    pass

    return jsonify({"results": results, "truncated": False})


@app.route("/api/sync", methods=["POST"])
def api_sync():
    body = request.get_json() or {}
    date = body.get("date", "").strip()
    profile = body.get("profile", "").strip()

    if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        return jsonify({"error": "date inválido"}), 400
    if not re.match(r"^[\w\-]+$", profile):
        return jsonify({"error": "profile inválido"}), 400

    s3_path = f"{S3_BUCKET}/logs/date={date}/"
    local_path = os.path.join(LOGS_DIR, f"date={date}")
    os.makedirs(local_path, exist_ok=True)

    cmd = ["aws", "s3", "sync", s3_path, local_path, "--profile", profile]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        return jsonify({
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        })
    except subprocess.TimeoutExpired:
        return jsonify({"error": "Timeout (300s) atingido"}), 504
    except FileNotFoundError:
        return jsonify({"error": "AWS CLI não encontrado. Verifique se está instalado e no PATH."}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/")
def index():
    return send_from_directory("viewer", "index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
