// ─── Sidebar ──────────────────────────────────────────────────────────────────

async function loadSessions() {
  var content = document.getElementById("sidebarContent");
  content.innerHTML = '<div class="sidebar-loading"><div class="spinner"></div><span>Carregando sessões…</span></div>';
  try {
    var data = await API.getSessions();
    var dates = data.dates;
    if (!dates || dates.length === 0) {
      content.innerHTML = '<div class="sidebar-loading">Nenhuma sessão encontrada.</div>';
      return;
    }
    App.allDates = dates;
    renderSidebar(dates);
  } catch (e) {
    content.innerHTML = '<div class="sidebar-loading" style="color:var(--color-error)">Erro ao carregar sessões</div>';
    console.error(e);
  }
}

function renderSidebar(dates) {
  var content = document.getElementById("sidebarContent");

  // Primeira data abre, demais ficam fechadas
  var html = dates.map(function(group, idx) {
    return renderDateGroup(group.date, group.sessions, idx === 0);
  }).join("");

  content.innerHTML = html || '<div class="sidebar-loading">Nenhuma sessão encontrada.</div>';
}

function renderDateGroup(date, sessions, isOpen) {
  var collapsedClass = isOpen ? "" : " collapsed";
  return '<div class="date-group' + collapsedClass + '" data-date="' + date + '">'
    + '<div class="date-header" onclick="toggleDateGroup(this)">'
    +   '<svg class="date-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>'
    +   '<span class="date-label">' + date + '</span>'
    +   '<span class="date-count">' + sessions.length + '</span>'
    + '</div>'
    + '<div class="session-list">'
    +   sessions.map(function(s) { return renderSessionItem(s, date); }).join("")
    + '</div>'
    + '</div>';
}

function renderSessionItem(s, date) {
  var preview = s.preview ? escHtml(s.preview) : "";
  var time = s.firstTimestamp ? formatTs(s.firstTimestamp) : "";
  return '<div class="session-item" onclick="selectSession(this,\'' + escHtml(s.sessionId) + '\',\'' + date + '\')" title="' + escHtml(s.sessionId) + '">'
    + '<div class="session-item-main">'
    +   '<span class="session-id">' + escHtml(shortId(s.sessionId, 8, 6)) + '</span>'
    +   (preview ? '<span class="session-preview">' + preview + '</span>' : "")
    +   '<div class="session-meta">'
    +     (time ? '<span class="session-time">' + time + '</span>' : "")
    +   '</div>'
    + '</div>'
    + '<span class="badge">' + s.messageCount + '</span>'
    + '</div>';
}

// Accordion: abre a data clicada e fecha todas as outras
function toggleDateGroup(header) {
  var group = header.closest(".date-group");
  var isCollapsed = group.classList.contains("collapsed");

  if (!isCollapsed) {
    // Estava aberta — apenas fecha
    group.classList.add("collapsed");
    return;
  }

  // Fecha todas as outras datas abertas
  document.querySelectorAll(".date-group:not(.collapsed)").forEach(function(g) {
    g.classList.add("collapsed");
  });

  // Abre a clicada
  group.classList.remove("collapsed");
}

function selectSession(el, sessionId, date) {
  if (App.activeItem) App.activeItem.classList.remove("active");
  el.classList.add("active");
  App.activeItem = el;
  history.replaceState(null, "", "#session=" + sessionId + "&date=" + date);
  App.loadSession(sessionId, date);
}
