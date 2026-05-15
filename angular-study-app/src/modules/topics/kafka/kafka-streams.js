(function() {
  var topic = {
    id: "kafka-streams",
    area: "kafka",
    title: "Kafka Streams",
    tag: "Processing",
    tags: ["kafka","streams","ktable","kstream","windowing"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ Kafka Streams — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
