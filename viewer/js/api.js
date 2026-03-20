const API = {
  async getSessions() {
    const res = await fetch("/api/sessions");
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },

  async getSession(sessionId, date) {
    const res = await fetch("/api/session/" + encodeURIComponent(sessionId) + "?date=" + date);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  },

  async sync(date, profile) {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, profile }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
    return data;
  },
};
