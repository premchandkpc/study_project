(function() {
  var topic = {
    id: "kafka-connect",
    area: "kafka",
    title: "Kafka Connect",
    tag: "Integration",
    tags: ["kafka","connect","connectors","smt"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ Kafka Connect — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
