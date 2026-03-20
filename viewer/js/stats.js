function computeStats(messages) {
  var totalDuration = 0, totalInput = 0, totalOutput = 0;
  var totalRefs = 0, totalKbSearches = 0;
  var agentId = null, region = null, traceEnabled = null;

  for (var i = 0; i < messages.length; i++) {
    var msg = messages[i];
    var ts = msg.timestamps || {};
    var usage = msg.usage || {};
    var trace = msg.trace || {};
    var agent = msg.agent || {};
    var flags = msg.flags || {};
    var items = trace.items || [];

    if (ts.duration_ms) totalDuration += ts.duration_ms;
    if (usage.input) totalInput += usage.input;
    if (usage.output) totalOutput += usage.output;

    for (var j = 0; j < items.length; j++) {
      var item = items[j];
      if (item.stage === "action") totalKbSearches++;
      if (item.details && item.details.references) {
        totalRefs += item.details.references.length;
      }
    }

    if (!agentId && agent.agentId) agentId = agent.agentId;
    if (!region && agent.region) region = agent.region;
    if (traceEnabled === null && flags.traceEnabled !== undefined) traceEnabled = flags.traceEnabled;
  }

  return {
    messageCount: messages.length,
    totalDuration: totalDuration,
    avgDuration: messages.length > 0 ? Math.round(totalDuration / messages.length) : 0,
    totalInput: totalInput,
    totalOutput: totalOutput,
    totalTokens: totalInput + totalOutput,
    totalRefs: totalRefs,
    totalKbSearches: totalKbSearches,
    agentId: agentId,
    region: region,
    traceEnabled: traceEnabled,
  };
}

function renderStatsBar(stats) {
  var items = [
    { label: "Mensagens", value: stats.messageCount, cls: "" },
    { label: "Duração Total", value: formatDuration(stats.totalDuration), cls: "" },
    { label: "Tempo Médio", value: formatDuration(stats.avgDuration), cls: stats.avgDuration > 5000 ? "warning" : "success" },
    { label: "Tokens In", value: formatNumber(stats.totalInput), cls: "" },
    { label: "Tokens Out", value: formatNumber(stats.totalOutput), cls: "" },
    { label: "Buscas KB", value: stats.totalKbSearches, cls: "" },
    { label: "Referências", value: stats.totalRefs, cls: "" },
  ];

  if (stats.region) items.push({ label: "Região", value: stats.region, cls: "mono" });
  if (stats.agentId) items.push({ label: "Agent ID", value: stats.agentId, cls: "accent mono" });
  if (stats.traceEnabled !== null) {
    items.push({ label: "Trace", value: stats.traceEnabled ? "✓ Ativo" : "✗ Inativo", cls: stats.traceEnabled ? "success" : "" });
  }

  return '<div class="stats-bar">'
    + '<div class="stats-bar-title">Sessão</div>'
    + items.map(function(i) {
        return '<div class="stat-item">'
          + '<div class="stat-label">' + i.label + '</div>'
          + '<div class="stat-value ' + i.cls + '">' + i.value + '</div>'
          + '</div>';
      }).join("")
    + '</div>';
}
