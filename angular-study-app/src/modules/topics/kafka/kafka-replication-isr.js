(function() {
  var topic = {
    id: "kafka-replication-isr",
    area: "kafka",
    title: "Kafka Replication & ISR",
    tag: "Reliability",
    tags: ["kafka","replication","isr","leader"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ Kafka Replication & ISR — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
