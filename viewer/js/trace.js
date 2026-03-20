// ─── Trace timeline ───────────────────────────────────────────────────────────

function renderTraceTimeline(items, msgIdx, query) {
  if (!items || items.length === 0) return "";

  // De-duplicate
  var seen = {};
  var unique = items.filter(function(item) {
    var key = (item.path || "") + JSON.stringify(item.details);
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });

  return '<div class="trace-timeline">'
    + unique.map(function(item, i) {
        return renderTraceStep(item, msgIdx + "-" + i, query);
      }).join("")
    + '</div>';
}

function renderTraceStep(item, stepId, query) {
  var stage = item.stage || "";
  var icon = item.icon || "•";
  var label = item.label || stage;
  var title = item.title || "";
  var details = item.details || {};
  var meta = details.metadata || {};
  var stageClass = "stage-" + (stage || "default");

  var body = "";

  // Function/group row (for action stage)
  if (details.actionGroupName || details.function) {
    body += '<div class="trace-fn-row">';
    if (details.actionGroupName) {
      body += '<span class="trace-fn-group">' + escHtml(details.actionGroupName) + '</span>';
    }
    if (details.actionGroupName && details.function) {
      body += '<span class="trace-fn-arrow">→</span>';
    }
    if (details.function) {
      body += '<span class="trace-fn-name">' + escHtml(details.function) + '()</span>';
    }
    body += '</div>';
  }

  // Rationale
  if (details.rationale) {
    body += '<div class="trace-rationale">' + hlText(details.rationale, query) + '</div>';
  }

  // KB query
  if (details.query) {
    body += '<div class="trace-query-row">'
      + '<span class="trace-query-label">🔍 Query:</span>'
      + '<span>' + hlText(details.query, query) + '</span>'
      + '</div>';
  }

  // References
  if (details.references && details.references.length > 0) {
    body += '<div class="trace-refs">'
      + details.references.map(function(ref, ri) {
          return renderRef(ref, stepId + "-" + ri, query);
        }).join("")
      + '</div>';
  }

  // Observation text (no references)
  if (details.text && !details.references) {
    body += '<div class="trace-obs-text">' + hlText(details.text, query) + '</div>';
  }

  var durHtml = meta.totalTimeMs != null
    ? '<span class="trace-step-dur">' + formatDuration(meta.totalTimeMs) + '</span>'
    : "";

  return '<div class="trace-step">'
    + '<div class="trace-step-indicator">'
    +   '<div class="trace-dot ' + stageClass + '">' + icon + '</div>'
    + '</div>'
    + '<div class="trace-step-content">'
    +   '<div class="trace-step-header">'
    +     '<span class="trace-step-tag ' + stageClass + '">' + escHtml(label) + '</span>'
    +     (title ? '<span class="trace-step-title">' + escHtml(title) + '</span>' : "")
    +     durHtml
    +   '</div>'
    +   body
    + '</div>'
    + '</div>';
}

function renderRef(ref, refId, query) {
  var uri = ref.sourceUri || "";
  var fname = sourceFileName(uri);
  var chunk = ref.chunk || "";
  var score = ref.score != null ? ref.score : null;
  var LIMIT = 300;
  var isLong = chunk.length > LIMIT;
  var chunkShort = isLong ? chunk.slice(0, LIMIT) + "…" : chunk;
  var sClass = score != null ? scoreClass(score) : "";
  var scoreLabel = score != null ? score.toFixed(3) : null;

  var shortHtml = query ? hlText(chunkShort, query) : escHtml(chunkShort);
  var fullHtml = query ? hlText(chunk, query) : escHtml(chunk);

  var refIdShort = "rs-" + refId;
  var refIdFull = "rf-" + refId;

  var chunkBody = '<div class="trace-ref-chunk" id="' + refIdShort + '">'
    + shortHtml
    + (isLong ? '<br><button class="chunk-toggle" onclick="expandRef(\'' + refId + '\')">ver mais ▼</button>' : "")
    + '</div>';
  if (isLong) {
    chunkBody += '<div class="trace-ref-chunk" id="' + refIdFull + '" style="display:none">'
      + fullHtml
      + '<br><button class="chunk-toggle" onclick="collapseRef(\'' + refId + '\')">ver menos ▲</button>'
      + '</div>';
  }

  return '<div class="trace-ref">'
    + '<div class="trace-ref-header">'
    +   '<span class="trace-ref-doc-icon">📄</span>'
    +   '<span class="trace-ref-source" title="' + escHtml(uri) + '">' + escHtml(fname) + '</span>'
    +   (scoreLabel ? '<span class="score-badge ' + sClass + '" title="Relevância">' + scoreLabel + '</span>' : "")
    +   '<button class="copy-btn" onclick="copyText(' + JSON.stringify(chunk) + ', this)">Copiar</button>'
    + '</div>'
    + '<div class="trace-ref-body">' + chunkBody + '</div>'
    + '</div>';
}

function expandRef(refId) {
  var s = document.getElementById("rs-" + refId);
  var f = document.getElementById("rf-" + refId);
  if (s) s.style.display = "none";
  if (f) f.style.display = "";
}

function collapseRef(refId) {
  var s = document.getElementById("rs-" + refId);
  var f = document.getElementById("rf-" + refId);
  if (f) f.style.display = "none";
  if (s) s.style.display = "";
}
