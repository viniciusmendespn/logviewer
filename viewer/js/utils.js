// ─── Formatting ───────────────────────────────────────────────────────────────

function formatTs(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  } catch { return isoStr; }
}

function formatTimeShort(isoStr) {
  if (!isoStr) return "—";
  try {
    return new Date(isoStr).toLocaleString("pt-BR", {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  } catch { return isoStr; }
}

function formatDuration(ms) {
  if (ms == null) return "—";
  if (ms < 1000) return ms + "ms";
  return (ms / 1000).toFixed(1) + "s";
}

function formatNumber(n) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR");
}

function shortId(id, head, tail) {
  if (!id) return "—";
  head = head || 8; tail = tail || 6;
  if (id.length <= head + tail + 1) return id;
  return id.slice(0, head) + "…" + id.slice(-tail);
}

function sourceFileName(uri) {
  if (!uri) return "referência";
  const parts = uri.split(/[/\\]/);
  return parts[parts.length - 1] || uri;
}

// ─── HTML Safety ─────────────────────────────────────────────────────────────

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Highlight search query inside already-escaped HTML
function hlText(rawText, query) {
  const escaped = escHtml(rawText);
  if (!query || !query.trim()) return escaped;
  const safe = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return escaped.replace(new RegExp(safe, "gi"), m => `<mark class="hl">${m}</mark>`);
}

// ─── Score helper ─────────────────────────────────────────────────────────────

function scoreClass(score) {
  if (score == null) return "";
  if (score >= 0.5) return "score-high";
  if (score >= 0.3) return "score-mid";
  return "score-low";
}

// ─── Clipboard ───────────────────────────────────────────────────────────────

function copyText(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    if (!btn) return;
    const orig = btn.textContent;
    btn.textContent = "Copiado!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 1500);
  }).catch(() => {});
}

// ─── JSON Syntax Highlight ────────────────────────────────────────────────────

function syntaxJson(json) {
  // Escapes first, then replaces tokens
  return escHtml(json)
    .replace(/&quot;([^&]*)&quot;(\s*:)/g, '<span class="json-key">&quot;$1&quot;</span>$2')
    .replace(/:\s*&quot;([^&]*)&quot;/g, ': <span class="json-str">&quot;$1&quot;</span>')
    .replace(/:\s*(-?\d+\.?\d*(?:e[+-]?\d+)?)/gi, ': <span class="json-num">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

// ─── Debounce ─────────────────────────────────────────────────────────────────

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}
