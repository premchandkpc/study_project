(function() {
  var topic = {
    id: "rmq-acks-delivery",
    area: "kafka",
    title: "RabbitMQ Acks & Delivery",
    tag: "Reliability",
    tags: ["rabbitmq","acks","nack","prefetch"],
    concept: "// TODO — coming soon",
    visual: function(mount) {
      mount.innerHTML = '<div style="padding:20px;color:#768390;font-size:13px">⚙️ RabbitMQ Acks & Delivery — interactive visual coming soon.</div>';
    },
    gotchas: [],
    interview: [],
    tradeoffs: "// TODO"
  };
  window.KAFKA_TOPICS = (window.KAFKA_TOPICS || []).concat([topic]);
})();
