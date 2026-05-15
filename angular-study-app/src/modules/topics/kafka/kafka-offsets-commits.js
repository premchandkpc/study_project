(function() {
  var topic = {
    id: "kafka-offsets-commits",
    area: "kafka",
    title: "Kafka Offsets & Delivery Semantics",
    tag: "Reliability",
    tags: ["kafka","offsets","exactly-once","idempotent"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ Kafka Offsets & Delivery Semantics — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
