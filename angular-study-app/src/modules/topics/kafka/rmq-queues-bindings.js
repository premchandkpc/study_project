(function() {
  var topic = {
    id: "rmq-queues-bindings",
    area: "kafka",
    title: "RabbitMQ Queues & Bindings",
    tag: "Messaging",
    tags: ["rabbitmq","queues","bindings","routing"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ RabbitMQ Queues & Bindings — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
