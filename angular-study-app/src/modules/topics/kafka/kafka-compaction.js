(function() {
  var topic = {
    id: "kafka-compaction",
    area: "kafka",
    title: "Kafka Log Compaction",
    tag: "Storage",
    tags: ["kafka","compaction","tombstones","retention"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ Kafka Log Compaction — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
