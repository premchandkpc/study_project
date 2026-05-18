# TOPIC_SCHEMA.md

# 🧩 Topic Schema Documentation

> Standard schema definition for all engineering learning topics in the platform.

---

# 🌟 Purpose

The Topic Schema defines how every topic should be structured inside the platform.

This ensures:

- consistency
- scalability
- rendering compatibility
- visualization support
- AI integration
- interactive learning support

---

# 🎯 Goals

Every topic should support:

```text
Learning
Visualization
Simulation
Execution Flows
Interview Preparation
Production Understanding
```

---

# 🔥 Core Topic Philosophy

Topics should not only explain:

```text
"What something is"
```

but also:

```text
How it works internally
How it behaves in production
How it fails
How it scales
How engineers debug it
```

---

# 🧠 High-Level Topic Structure

```text
Topic
 ├── Metadata
 ├── Learning Content
 ├── Visualizations
 ├── Simulations
 ├── Code Examples
 ├── Production Scenarios
 ├── Debugging Scenarios
 ├── Interview Questions
 └── AI Metadata
```

---

# 📦 Base Topic Schema

```js
{
  id: "",
  title: "",
  slug: "",
  category: "",

  difficulty: "",

  description: "",

  tags: [],

  prerequisites: [],

  concepts: [],

  visualizations: [],

  animations: [],

  simulations: [],

  codeExamples: [],

  executionFlows: [],

  productionScenarios: [],

  debuggingScenarios: [],

  interviewQuestions: [],

  quizzes: [],

  references: [],

  aiMetadata: {}
}
```

---

# 🔍 Schema Field Breakdown

# 🆔 Metadata Fields

## id

Unique topic identifier.

Example:

```js
id: "kafka-consumer-groups"
```

---

## title

Human-readable topic title.

Example:

```js
title: "Kafka Consumer Groups"
```

---

## slug

URL-safe identifier.

Example:

```js
slug: "kafka-consumer-groups"
```

---

## category

Primary learning category.

Examples:

```js
category: "kafka"
category: "java"
category: "system-design"
```

---

# 📈 Difficulty Levels

Allowed values:

```text
Beginner
Intermediate
Advanced
Expert
```

---

# 🏷️ Tags

Used for:

- search
- filtering
- recommendations
- AI retrieval

Example:

```js
tags: [
  "kafka",
  "consumer-group",
  "distributed-systems",
  "rebalance"
]
```

---

# 📚 Prerequisites

Topics required before learning this topic.

Example:

```js
prerequisites: [
  "kafka-introduction",
  "kafka-partitions"
]
```

---

# 🧠 Concepts Section

Defines conceptual explanations.

Example:

```js
concepts: [
  {
    title: "Consumer Group",
    explanation: "..."
  }
]
```

---

# 🎬 Visualizations

Defines graphical learning components.

Example:

```js
visualizations: [
  {
    type: "flow",
    title: "Consumer Rebalance Flow"
  }
]
```

---

# 🎞️ Animations

Defines animation behaviors.

Example:

```js
animations: [
  {
    type: "packet-flow",
    trigger: "rebalance-start"
  }
]
```

---

# 🧩 Simulations

Defines interactive runtime simulations.

Example:

```js
simulations: [
  {
    type: "kafka-rebalance",
    controls: [
      "add-consumer",
      "remove-consumer"
    ]
  }
]
```

---

# 💻 Code Examples

Supports multi-language examples.

Example:

```js
codeExamples: [
  {
    language: "go",
    title: "Kafka Consumer Example",
    code: "..."
  }
]
```

---

# ⚡ Execution Flows

Step-by-step runtime flows.

Example:

```js
executionFlows: [
  {
    title: "Message Consumption",

    steps: [
      "poll messages",
      "deserialize record",
      "process event",
      "commit offset"
    ]
  }
]
```

---

# 🏭 Production Scenarios

Real-world engineering scenarios.

Example:

```js
productionScenarios: [
  {
    title: "Consumer Lag Spike",

    symptoms: [
      "high lag",
      "slow processing"
    ],

    causes: [
      "slow downstream APIs"
    ],

    fixes: [
      "increase consumer concurrency"
    ]
  }
]
```

---

# 🐞 Debugging Scenarios

Real production debugging situations.

Example:

```js
debuggingScenarios: [
  {
    issue: "rebalance storm",

    debuggingSteps: [
      "check heartbeat timeout",
      "analyze poll duration"
    ]
  }
]
```

---

# 🎯 Interview Questions

Interview preparation support.

Example:

```js
interviewQuestions: [
  {
    question: "What causes Kafka rebalance?",

    answer: "..."
  }
]
```

---

# 📝 Quizzes

Interactive knowledge checks.

Example:

```js
quizzes: [
  {
    question: "What triggers partition reassignment?",

    options: [],

    answer: ""
  }
]
```

---

# 🤖 AI Metadata

Used for:

- embeddings
- semantic search
- recommendations
- AI tutoring

Example:

```js
aiMetadata: {
  embeddingsEnabled: true,
  semanticKeywords: [
    "rebalance",
    "offset",
    "consumer lag"
  ]
}
```

---

# 🎬 Visualization Types

# Supported Visualization Types

| Type | Purpose |
|---|---|
| flow | request flows |
| graph | dependency graphs |
| cluster | distributed systems |
| timeline | runtime events |
| topology | infra architecture |
| memory | JVM/runtime memory |
| queue | messaging systems |

---

# 🎞️ Animation Types

| Animation | Purpose |
|---|---|
| packet-flow | network movement |
| replication | data replication |
| scaling | autoscaling |
| gc-movement | garbage collection |
| retry-loop | retries |
| rebalance | partition movement |

---

# 💻 Supported Languages

Topics may include:

- Java
- Go
- Python
- Rust
- JavaScript
- TypeScript
- SQL
- YAML
- Bash

---

# 🧩 Example Complete Topic

```js
{
  id: "kafka-consumer-group",

  title: "Kafka Consumer Groups",

  category: "kafka",

  difficulty: "Intermediate",

  tags: [
    "kafka",
    "distributed-systems"
  ],

  prerequisites: [
    "kafka-introduction"
  ],

  concepts: [],

  visualizations: [],

  animations: [],

  simulations: [],

  codeExamples: [],

  executionFlows: [],

  productionScenarios: [],

  debuggingScenarios: [],

  interviewQuestions: [],

  quizzes: []
}
```

---

# 🏗️ Rendering Pipeline

```text
Topic JSON
   ↓
Schema Parser
   ↓
Renderer
   ↓
Visualization Engine
   ↓
Animation Engine
   ↓
Interactive UI
```

---

# 🤖 AI Processing Pipeline

```text
Topic
   ↓
Chunking
   ↓
Embeddings
   ↓
Vector DB
   ↓
Semantic Search
   ↓
AI Retrieval
```

---

# 📚 Learning Flow Standard

Every topic should follow:

```text
Concept
   ↓
Visualization
   ↓
Execution Flow
   ↓
Code Example
   ↓
Production Scenario
   ↓
Debugging
   ↓
Interview Questions
```

---

# 🔥 Topic Design Rules

# Topics Must Include

- clear explanation
- runtime understanding
- production relevance
- debugging perspective
- scaling considerations
- visualization support

---

# Topics Should Avoid

- theory-only explanations
- shallow examples
- API memorization
- copy-paste tutorials
- static content without flow

---

# 🚀 Future Extensions

Future schema additions:

- realtime collaboration
- AI-generated quizzes
- adaptive learning
- execution replay
- distributed simulations
- live coding sandboxes

---

# 💡 Core Principle

```text
Every topic should feel like
an interactive engineering system,
not a static article.
```