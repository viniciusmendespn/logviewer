// ─── Message rendering ────────────────────────────────────────────────────────

function renderMessage(msg, idx, query) {
  var req = msg.request || {};
  var resp = msg.response || {};
  var usage = msg.usage || {};
  var ts = msg.timestamps || {};
  var session = msg.session || {};
  var traceItems = (msg.trace && msg.trace.items) || [];

  var userText = req.text || "";
  var assistantText = resp.text || "";

  // ── User bubble ──
  var userContent = query ? hlText(userText, query) : escHtml(userText);

  // ── Assistant bubble ──
  var assistantContent;
  if (assistantText) {
    assistantContent = '<div class="md-content">' + marked.parse(assistantText) + '</div>';
  } else {
    assistantContent = '<em style="color:var(--text-muted)">sem resposta</em>';
  }

  // ── Meta pills ──
  var pills = [];
  if (ts.duration_ms != null) {
    var dCls = ts.duration_ms > 8000 ? "warn" : "";
    pills.push('<span class="pill ' + dCls + '" title="Duração">'
      + svgIcon("clock") + formatDuration(ts.duration_ms) + '</span>');
  }
  if (usage.input != null) {
    pills.push('<span class="pill" title="Tokens de entrada">↑&nbsp;' + formatNumber(usage.input) + '</span>');
  }
  if (usage.output != null) {
    pills.push('<span class="pill" title="Tokens de saída">↓&nbsp;' + formatNumber(usage.output) + '</span>');
  }
  if (usage.total != null) {
    pills.push('<span class="pill" title="Total de tokens">∑&nbsp;' + formatNumber(usage.total) + '</span>');
  }

  // Count KB searches and refs
  var kbCount = 0, refCount = 0;
  for (var i = 0; i < traceItems.length; i++) {
    if (traceItems[i].stage === "action") kbCount++;
    if (traceItems[i].details && traceItems[i].details.references) {
      refCount += traceItems[i].details.references.length;
    }
  }
  if (kbCount > 0) {
    pills.push('<span class="pill" title="Buscas na base de conhecimento">📚&nbsp;' + kbCount + ' busca' + (kbCount !== 1 ? "s" : "") + '</span>');
  }
  if (refCount > 0) {
    pills.push('<span class="pill" title="Referências retornadas">📎&nbsp;' + refCount + ' ref' + (refCount !== 1 ? "s" : "") + '</span>');
  }

  // ── De-duplicate trace ──
  var seen = {};
  var uniqueTrace = traceItems.filter(function(item) {
    var key = (item.path || "") + JSON.stringify(item.details);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });

  // ── Trace section ──
  var traceHtml = "";
  if (uniqueTrace.length > 0) {
    traceHtml = '<div class="trace-section">'
      + '<button class="trace-toggle" onclick="toggleTrace(this,' + idx + ')">'
      +   svgIcon("chevron-right", "trace-arrow")
      +   '<span class="trace-toggle-label">Trace de Execução</span>'
      +   '<span class="trace-toggle-count">' + uniqueTrace.length + ' step' + (uniqueTrace.length !== 1 ? "s" : "") + '</span>'
      +   '<div class="trace-toggle-actions">'
      +     '<button class="copy-btn" onclick="copyTraceAsJson(event,' + idx + ')">JSON</button>'
      +   '</div>'
      + '</button>'
      + '<div class="trace-body" id="tb-' + idx + '">'
      +   renderTraceTimeline(uniqueTrace, idx, query)
      + '</div>'
      + '</div>';
  }

  // ── Message ID pill ──
  var msgIdHtml = session.messageId
    ? '<span class="msg-id-pill" title="' + escHtml(session.messageId) + '">' + escHtml(shortId(session.messageId, 12, 0)) + '</span>'
    : "";

  var searchClass = query && (userText.toLowerCase().includes(query.toLowerCase()) || assistantText.toLowerCase().includes(query.toLowerCase()))
    ? " search-highlighted"
    : "";

  return '<div class="msg-card' + searchClass + '" id="msg-' + idx + '">'
    + '<div class="msg-card-header">'
    +   '<span class="msg-index">#' + (idx + 1) + '</span>'
    +   msgIdHtml
    +   '<span class="msg-header-ts">' + (ts.start_iso ? formatTs(ts.start_iso) : "") + '</span>'
    +   '<div class="msg-header-actions">'
    +     '<button class="copy-btn" onclick="App.openDetail(' + idx + ',\'metadata\')">Detalhes</button>'
    +     '<button class="copy-btn" onclick="App.openDetail(' + idx + ',\'json\')">JSON</button>'
    +   '</div>'
    + '</div>'
    + '<div class="msg-card-inner">'
    +   '<div class="bubble bubble-user">'
    +     '<div class="bubble-header">'
    +       '<span class="bubble-label">Usuário</span>'
    +       '<div class="bubble-meta">'
    +         (req.text_len != null ? '<span class="bubble-len">' + req.text_len + ' chars</span>' : "")
    +         '<button class="copy-btn" onclick="copyText(App.messages[' + idx + '].request.text,this)">Copiar</button>'
    +       '</div>'
    +     '</div>'
    +     '<div class="bubble-text">' + userContent + '</div>'
    +   '</div>'
    +   '<div class="bubble bubble-assistant">'
    +     '<div class="bubble-header">'
    +       '<span class="bubble-label">Assistente</span>'
    +       '<div class="bubble-meta">'
    +         (resp.text_len != null ? '<span class="bubble-len">' + resp.text_len + ' chars</span>' : "")
    +         (resp.chunks != null ? '<span class="bubble-len">' + resp.chunks + ' chunk' + (resp.chunks !== 1 ? "s" : "") + '</span>' : "")
    +         '<button class="copy-btn" onclick="copyText(App.messages[' + idx + '].response.text,this)">Copiar</button>'
    +       '</div>'
    +     '</div>'
    +     assistantContent
    +   '</div>'
    + '</div>'
    + '<div class="meta-bar">'
    +   pills.join("")
    + '</div>'
    + traceHtml
    + '</div>';
}

function toggleTrace(btn, idx) {
  var body = document.getElementById("tb-" + idx);
  var open = body.classList.toggle("open");
  btn.classList.toggle("open", open);
}

function copyTraceAsJson(event, idx) {
  event.stopPropagation();
  var msg = App.messages[idx];
  if (!msg) return;
  copyText(JSON.stringify(msg.trace, null, 2), event.currentTarget);
}

// ─── SVG icons inline ─────────────────────────────────────────────────────────

function svgIcon(name, cls) {
  var c = cls ? ' class="' + cls + '"' : '';
  if (name === "clock") {
    return '<svg' + c + ' width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  }
  if (name === "chevron-right") {
    return '<svg' + c + ' width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>';
  }
  return "";
}
