(function() {
  var topic = {
    id: "kafka-schema-registry",
    area: "kafka",
    title: "Schema Registry",
    tag: "Serialization",
    tags: ["kafka","avro","protobuf","schema","evolution"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ Schema Registry — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
