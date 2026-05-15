(function() {
  var topic = {
    id: "rmq-exchanges",
    area: "kafka",
    title: "RabbitMQ Exchanges",
    tag: "Messaging",
    tags: ["rabbitmq","exchange","direct","fanout","topic"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ RabbitMQ Exchanges — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
