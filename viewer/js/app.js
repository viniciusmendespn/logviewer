// ─── App State ────────────────────────────────────────────────────────────────

var App = {
  allDates: null,
  messages: [],
  activeItem: null,
  activeSession: null,
  activeDate: null,
  detailIdx: null,
  detailTab: "metadata",
  searchQuery: "",
  pendingScrollMsgIndex: null,
  pendingScrollField: null,

  // ── Load session messages ──
  loadSession: async function(sessionId, date) {
    var emptyState = document.getElementById("emptyState");
    var convView = document.getElementById("convView");
    emptyState.style.display = "none";
    convView.style.display = "flex";
    convView.innerHTML = '<div class="page-loading"><div class="spinner"></div><span>Carregando mensagens…</span></div>';
    App.messages = [];
    App.activeSession = sessionId;
    App.activeDate = date;

    try {
      var data = await API.getSession(sessionId, date);
      if (data.error) {
        convView.innerHTML = '<div class="page-loading" style="color:var(--color-error)">' + escHtml(data.error) + '</div>';
        return;
      }
      var messages = data.messages || [];
      if (messages.length === 0) {
        convView.innerHTML = '<div class="page-loading">Nenhuma mensagem válida.</div>';
        return;
      }
      App.messages = messages;
      App.renderConv(messages, App.searchQuery);

      // Scroll para mensagem pendente (vindo de resultado de busca)
      if (App.pendingScrollMsgIndex != null) {
        var idx = App.pendingScrollMsgIndex;
        App.pendingScrollMsgIndex = null;
        App.pendingScrollField = null;
        Search.scrollToMsg(idx);
      }
    } catch (e) {
      convView.innerHTML = '<div class="page-loading" style="color:var(--color-error)">Erro ao carregar sessão</div>';
      console.error(e);
    }
  },

  // ── Render conversation ──
  renderConv: function(messages, query) {
    var convView = document.getElementById("convView");
    var stats = computeStats(messages);
    convView.innerHTML = renderStatsBar(stats)
      + '<div id="msgList">'
      + messages.map(function(m, i) { return renderMessage(m, i, query); }).join("")
      + '</div>';
  },

  // ── Detail Panel ──
  openDetail: function(idx, tab) {
    App.detailIdx = idx;
    App.detailTab = tab || "metadata";
    App.renderDetail();
    document.getElementById("detailPanel").classList.add("open");
  },

  closeDetail: function() {
    document.getElementById("detailPanel").classList.remove("open");
  },

  renderDetail: function() {
    var idx = App.detailIdx;
    var msg = App.messages[idx];
    if (!msg) return;

    // Sync tab UI
    document.querySelectorAll(".detail-tab").forEach(function(t) {
      t.classList.toggle("active", t.dataset.tab === App.detailTab);
    });

    var content = document.getElementById("detailContent");

    if (App.detailTab === "json") {
      var json = JSON.stringify(msg, null, 2);
      content.innerHTML = '<div class="json-viewer-wrap">'
        + '<div class="json-copy-bar">'
        +   '<button class="copy-btn" onclick="copyText(JSON.stringify(App.messages[App.detailIdx],null,2),this)">Copiar JSON</button>'
        + '</div>'
        + '<div class="json-viewer">' + syntaxJson(json) + '</div>'
        + '</div>';
      return;
    }

    // Metadata tab
    var session = msg.session || {};
    var agent = msg.agent || {};
    var ts = msg.timestamps || {};
    var usage = msg.usage || {};
    var flags = msg.flags || {};
    var trace = msg.trace || {};
    var req = msg.request || {};
    var resp = msg.response || {};

    content.innerHTML = detailSection("Sessão", [
        dr("Session ID", session.sessionId),
        dr("Message ID", session.messageId),
        dr("Memory ID", session.memoryId),
        dr("Data", session.date),
      ])
      + detailSection("Agente AWS", [
        dr("Região", agent.region),
        dr("Agent ID", agent.agentId),
        dr("Alias ID", agent.agentAliasId),
      ])
      + detailSection("Timestamps", [
        dr("Início", ts.start_iso ? formatTs(ts.start_iso) : null, "plain"),
        dr("Fim", ts.end_iso ? formatTs(ts.end_iso) : null, "plain"),
        dr("Duração", ts.duration_ms != null ? formatDuration(ts.duration_ms) : null, "plain"),
      ])
      + detailSection("Tokens", [
        dr("Input", usage.input != null ? formatNumber(usage.input) : null, "plain"),
        dr("Output", usage.output != null ? formatNumber(usage.output) : null, "plain"),
        dr("Total", usage.total != null ? formatNumber(usage.total) : null, "plain"),
      ])
      + detailSection("Request / Response", [
        dr("Req. chars", req.text_len != null ? formatNumber(req.text_len) : null, "plain"),
        dr("Resp. chars", resp.text_len != null ? formatNumber(resp.text_len) : null, "plain"),
        dr("Chunks", resp.chunks != null ? resp.chunks : null, "plain"),
      ])
      + detailSection("Flags", [
        drFlag("Trace", flags.traceEnabled),
        drFlag("Debug", flags.debugEnabled),
        drFlag("Emitido ao cliente", trace.emitted_to_client),
      ]);
  },
};

// ─── Detail helpers ───────────────────────────────────────────────────────────

function detailSection(title, rows) {
  var filtered = rows.filter(Boolean).join("");
  if (!filtered) return "";
  return '<div class="detail-section">'
    + '<div class="detail-section-title">' + title + '</div>'
    + filtered
    + '</div>';
}

function dr(key, value, valClass) {
  if (value == null || value === "") return "";
  return '<div class="detail-row">'
    + '<span class="detail-key">' + escHtml(key) + '</span>'
    + '<span class="detail-val ' + (valClass || "") + '">' + escHtml(String(value)) + '</span>'
    + '</div>';
}

function drFlag(key, value) {
  if (value == null) return "";
  var cls = value ? "ok" : "no";
  var label = value ? "✓ Ativo" : "✗ Inativo";
  return '<div class="detail-row">'
    + '<span class="detail-key">' + escHtml(key) + '</span>'
    + '<span class="detail-val ' + cls + '">' + label + '</span>'
    + '</div>';
}

// ─── Version ──────────────────────────────────────────────────────────────────

async function loadVersion() {
  try {
    var data = await API.getVersion();
    var label = "v" + data.version;
    if (data.commit) label += " (" + data.commit + ")";
    document.getElementById("appVersion").textContent = label;
    document.getElementById("appVersion").title = "Versão atual";
    checkForUpdate(data.version);
  } catch (e) { /* silencioso */ }
}

async function checkForUpdate(localVersion) {
  try {
    var res = await fetch(
      "https://raw.githubusercontent.com/viniciusmendespn/logviewer/master/VERSION",
      { cache: "no-store" }
    );
    if (!res.ok) return;
    var remoteVersion = (await res.text()).trim();
    if (remoteVersion && remoteVersion !== localVersion) {
      showUpdateBanner(localVersion, remoteVersion);
    }
  } catch (e) { /* sem acesso à internet ou GitHub indisponível */ }
}

function showUpdateBanner(local, remote) {
  var banner = document.createElement("div");
  banner.className = "update-banner";
  banner.innerHTML =
    '<span class="update-banner-text">'
    + '🆕 Nova versão disponível: <strong>v' + remote + '</strong>'
    + ' &nbsp;(você está na v' + local + ')'
    + ' — execute <code>update.bat</code> para atualizar'
    + '</span>'
    + '<button class="update-banner-close" title="Fechar">'
    +   '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">'
    +     '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>'
    +   '</svg>'
    + '</button>';
  banner.querySelector(".update-banner-close").addEventListener("click", function() {
    banner.remove();
  });
  document.body.prepend(banner);
}

// ─── Theme ────────────────────────────────────────────────────────────────────

function initTheme() {
  var saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  document.getElementById("themeToggle").addEventListener("click", function() {
    var cur = document.documentElement.getAttribute("data-theme");
    var next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

// ─── Sidebar toggle ───────────────────────────────────────────────────────────

function initSidebar() {
  document.getElementById("sidebarToggle").addEventListener("click", function() {
    document.body.classList.toggle("sidebar-closed");
  });
}

// ─── Global search (delegado para search.js) ──────────────────────────────────

function initSearch() {
  Search.init();
}

// ─── Detail Panel tabs + close ───────────────────────────────────────────────

function initDetailPanel() {
  document.querySelectorAll(".detail-tab").forEach(function(tab) {
    tab.addEventListener("click", function() {
      App.detailTab = tab.dataset.tab;
      App.renderDetail();
    });
  });
  document.getElementById("detailClose").addEventListener("click", App.closeDetail);
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function initKeyboard() {
  document.addEventListener("keydown", function(e) {
    // Ctrl+B — toggle sidebar
    if (e.ctrlKey && e.key === "b") {
      e.preventDefault();
      document.body.classList.toggle("sidebar-closed");
      return;
    }
    // Ctrl+K — focus search
    if (e.ctrlKey && e.key === "k") {
      e.preventDefault();
      document.getElementById("globalSearch").focus();
      return;
    }
    // Escape
    if (e.key === "Escape") {
      var panel = document.getElementById("detailPanel");
      if (panel.classList.contains("open")) { App.closeDetail(); return; }
      var overlay = document.getElementById("syncOverlay");
      if (overlay.classList.contains("open")) { closeSyncModal(); return; }
      if (App.searchQuery) {
        document.getElementById("globalSearch").value = "";
        App.searchQuery = "";
        if (App.messages.length > 0) App.renderConv(App.messages, "");
      }
    }
  });
}

// ─── Sync Modal ───────────────────────────────────────────────────────────────

function getSyncProfile() {
  var v = document.getElementById("profileInput").value.trim();
  if (!v) v = localStorage.getItem("awsProfile") || "";
  return v;
}

function getSyncDate() {
  return document.getElementById("syncDateInput").value.trim();
}

function updateSyncCmd() {
  var date = getSyncDate();
  var profile = getSyncProfile() || "wf-hyundai";
  var preview = date
    ? 'aws s3 sync "s3://chat-banco-hyundai-log/logs/date=' + date + '/" "logs/date=' + date + '" --profile ' + profile
    : '— preencha a data acima —';
  document.getElementById("syncCmdPreview").textContent = preview;
}

function openSyncModal(event, date) {
  if (event) event.stopPropagation();

  // Preenche data sugerida (data passada ou hoje)
  var suggested = date || new Date().toISOString().slice(0, 10);
  document.getElementById("syncDateInput").value = suggested;

  // Restaura profile salvo
  document.getElementById("profileInput").value = localStorage.getItem("awsProfile") || "";

  updateSyncCmd();
  document.getElementById("syncLog").textContent = "Clique em Sincronizar para iniciar.";
  document.getElementById("syncLog").className = "sync-log";
  document.getElementById("syncRunBtn").disabled = false;
  document.getElementById("syncProgress").style.display = "none";
  document.getElementById("syncOverlay").classList.add("open");
}

function closeSyncModal() {
  document.getElementById("syncOverlay").classList.remove("open");
}

async function runSync() {
  var date = getSyncDate();
  var profile = getSyncProfile();

  var logEl = document.getElementById("syncLog");

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    logEl.textContent = "Informe uma data válida no formato YYYY-MM-DD.";
    logEl.className = "sync-log err";
    return;
  }
  if (!profile) {
    logEl.textContent = "Informe o nome do profile AWS.";
    logEl.className = "sync-log err";
    return;
  }

  // Salva o profile para próxima vez
  localStorage.setItem("awsProfile", profile);

  var runBtn = document.getElementById("syncRunBtn");
  var progress = document.getElementById("syncProgress");

  logEl.className = "sync-log";
  logEl.textContent = "Sincronizando…";
  runBtn.disabled = true;
  progress.style.display = "block";

  try {
    var data = await API.sync(date, profile);
    var out = (data.stdout || "").trim();
    var err = (data.stderr || "").trim();
    var rc = data.returncode;
    var summary = rc === 0
      ? "Concluído. " + data.sessions + " session(s) · " + data.messages + " mensagem(s) para esta data."
      : "Finalizado com código " + rc + ".";
    logEl.textContent = [
      summary,
      out || "(sem saída)",
      err ? "\n--- stderr ---\n" + err : "",
    ].join("\n").trim();
    logEl.className = "sync-log" + (rc === 0 ? " ok" : " err");
    if (rc === 0) loadSessions();
  } catch (e) {
    logEl.textContent = "Erro: " + e.message;
    logEl.className = "sync-log err";
  }

  runBtn.disabled = false;
  progress.style.display = "none";
}

// ─── Init ─────────────────────────────────────────────────────────────────────

(function init() {
  // Configure marked
  if (typeof marked !== "undefined") {
    marked.setOptions({ breaks: true, gfm: true });
  }

  loadVersion();
  initTheme();
  initSidebar();
  initSearch();
  initDetailPanel();
  initKeyboard();

  // Sync modal: atualiza preview ao digitar
  document.getElementById("syncDateInput").addEventListener("input", updateSyncCmd);
  document.getElementById("profileInput").addEventListener("input", updateSyncCmd);

  // Sync overlay click-outside
  document.getElementById("syncOverlay").addEventListener("click", function(e) {
    if (e.target === this) closeSyncModal();
  });
  document.getElementById("syncRunBtn").addEventListener("click", runSync);

  loadSessions();
})();
