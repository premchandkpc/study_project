(function() {
  var topic = {
    id: "db-wal",
    area: "databases",
    title: "Write-Ahead Log (WAL)",
    tag: "Internals",
    tags: ["database","wal","crash-recovery","checkpoint"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ Write-Ahead Log (WAL) — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.DB_TOPICS = (window.DB_TOPICS || []).concat([topic]);
})();
