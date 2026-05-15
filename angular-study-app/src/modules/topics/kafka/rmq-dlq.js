(function() {
  var topic = {
    id: "rmq-dlq",
    area: "kafka",
    title: "RabbitMQ Dead Letter Queues",
    tag: "Reliability",
    tags: ["rabbitmq","dlq","retry","ttl"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ RabbitMQ Dead Letter Queues — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
