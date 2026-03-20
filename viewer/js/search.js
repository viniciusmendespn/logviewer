// ─── Global Search ────────────────────────────────────────────────────────────
// Busca palavras em perguntas e respostas de TODAS as sessões (via /api/search)
// e também destaca matches na sessão aberta.

var Search = {
  lastQuery: "",
  panel: null,
  input: null,

  init: function() {
    Search.input = document.getElementById("globalSearch");
    Search.panel = document.getElementById("searchResultsPanel");

    Search.input.addEventListener("input", debounce(Search.onInput, 320));
    Search.input.addEventListener("focus", function() {
      if (Search.lastQuery.length >= 2) Search.panel.style.display = "flex";
    });
    Search.input.addEventListener("keydown", function(e) {
      if (e.key === "Escape") { Search.close(); Search.input.blur(); }
      if (e.key === "ArrowDown") {
        var first = Search.panel.querySelector(".search-result-item");
        if (first) { e.preventDefault(); first.focus(); }
      }
    });

    // Fechar ao clicar fora
    document.addEventListener("click", function(e) {
      if (!Search.input.contains(e.target) && !Search.panel.contains(e.target)) {
        Search.close();
      }
    });
  },

  onInput: function() {
    var q = Search.input.value.trim();
    Search.lastQuery = q;

    // Atualiza highlights na sessão aberta
    if (App.messages.length > 0) {
      App.searchQuery = q;
      App.renderConv(App.messages, q);
    }

    if (q.length < 2) {
      Search.close();
      return;
    }

    Search.showLoading(q);
    Search.runSearch(q);
  },

  runSearch: async function(q) {
    try {
      var res = await fetch("/api/search?q=" + encodeURIComponent(q));
      var data = await res.json();

      // Ignora resultado se a query mudou enquanto esperava
      if (Search.lastQuery !== q) return;

      Search.showResults(q, data.results || [], data.truncated);
    } catch (e) {
      if (Search.lastQuery !== q) return;
      Search.showError();
    }
  },

  showLoading: function(q) {
    Search.panel.style.display = "flex";
    Search.panel.style.flexDirection = "column";
    Search.panel.innerHTML =
      '<div class="search-loading">'
      + '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div>'
      + '<span>Buscando por "<strong>' + escHtml(q) + '</strong>"…</span>'
      + '</div>';
  },

  showResults: function(q, results, truncated) {
    if (results.length === 0) {
      Search.panel.innerHTML =
        '<div class="search-empty">'
        + '<span style="font-size:24px">🔍</span>'
        + '<span>Nenhum resultado para "<strong>' + escHtml(q) + '</strong>"</span>'
        + '</div>';
      return;
    }

    var header = '<div class="search-results-header">'
      + '<span class="search-results-count">'
      + results.length + (truncated ? "+" : "") + ' resultado' + (results.length !== 1 ? "s" : "")
      + ' para "<strong>' + escHtml(q) + '</strong>"'
      + '</span>'
      + '<button class="search-results-close" onclick="Search.close()" title="Fechar">✕</button>'
      + '</div>';

    var list = '<div class="search-results-list">'
      + results.map(function(r, i) { return Search.renderResultItem(r, q, i); }).join("")
      + '</div>';

    var footer = truncated
      ? '<div class="search-truncated-note">Mostrando primeiros 60 resultados — refine a busca para ver mais</div>'
      : "";

    Search.panel.innerHTML = header + list + footer;

    // Keyboard nav entre itens
    Search.panel.querySelectorAll(".search-result-item").forEach(function(el) {
      el.setAttribute("tabindex", "0");
      el.addEventListener("keydown", function(e) {
        if (e.key === "ArrowDown" && el.nextElementSibling) { e.preventDefault(); el.nextElementSibling.focus(); }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          if (el.previousElementSibling) el.previousElementSibling.focus();
          else Search.input.focus();
        }
        if (e.key === "Enter") el.click();
      });
    });
  },

  renderResultItem: function(r, q, idx) {
    var snippet = Search.highlightSnippet(r.snippet, q);
    var fieldLabel = r.field === "request" ? "Pergunta" : "Resposta";
    var fieldCls = r.field;
    var sessShort = shortId(r.sessionId, 8, 6);
    var msgNum = "#" + (r.msgIndex + 1);

    return '<div class="search-result-item"'
      + ' onclick="Search.goToResult(' + JSON.stringify(r) + ')"'
      + ' title="Ir para mensagem ' + msgNum + ' da sessão ' + escHtml(r.sessionId) + '"'
      + '>'
      + '<div class="search-result-meta">'
      +   '<span class="search-result-date">' + escHtml(r.date) + '</span>'
      +   '<span class="search-result-session">' + escHtml(sessShort) + '</span>'
      +   '<span class="search-result-field ' + fieldCls + '">' + fieldLabel + '</span>'
      +   '<span class="search-result-msg">' + msgNum + '</span>'
      + '</div>'
      + '<div class="search-result-snippet">' + snippet + '</div>'
      + '</div>';
  },

  highlightSnippet: function(text, q) {
    if (!text || !q) return escHtml(text || "");
    var escaped = escHtml(text);
    var safe = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return escaped.replace(new RegExp(safe, "gi"), function(m) {
      return '<mark class="hl">' + m + '</mark>';
    });
  },

  goToResult: function(r) {
    // Salva a query ANTES de fechar (close() limpa lastQuery)
    var q = Search.lastQuery;

    Search.panel.style.display = "none";

    // Mantém a query no input e nos highlights da sessão
    App.searchQuery = q;
    Search.input.value = q;

    var isSameSession = App.activeSession === r.sessionId && App.activeDate === r.date;

    if (isSameSession) {
      // Sessão já carregada — só rola
      Search.scrollToMsg(r.msgIndex);
      return;
    }

    // Marca a mensagem alvo para scroll após carregamento
    App.pendingScrollMsgIndex = r.msgIndex;

    // Abre a data na sidebar se estiver colapsada
    var sidebarItem = document.querySelector('.session-item[onclick*="' + r.sessionId + '"]');
    if (sidebarItem) {
      var group = sidebarItem.closest(".date-group");
      if (group && group.classList.contains("collapsed")) {
        document.querySelectorAll(".date-group:not(.collapsed)").forEach(function(g) {
          g.classList.add("collapsed");
        });
        group.classList.remove("collapsed");
      }
      selectSession(sidebarItem, r.sessionId, r.date);
    } else {
      App.loadSession(r.sessionId, r.date);
    }
  },

  // Rola até a mensagem e pisca o destaque.
  // Usa requestAnimationFrame duplo para garantir que o browser terminou o layout.
  scrollToMsg: function(msgIndex) {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        var el = document.getElementById("msg-" + msgIndex);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.classList.add("search-highlighted");
        setTimeout(function() { el.classList.remove("search-highlighted"); }, 2500);
      });
    });
  },

  showError: function() {
    Search.panel.innerHTML =
      '<div class="search-empty" style="color:var(--color-error)">Erro ao buscar</div>';
  },

  close: function() {
    Search.panel.style.display = "none";
    Search.lastQuery = "";
  },
};
