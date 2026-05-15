(function() {
  var topic = {
    id: "agent-skills-tools",
    area: "agents",
    title: "Skills & Tool Definition",
    tag: "Skills",
    tags: ["skills", "function calling", "tool definition", "json schema"],
    concept:
`**Skills** (or Tools) are functions provided to an LLM. A skill definition usually includes:
- **Name**: Unique identifier.
- **Description**: Highly detailed text explaining *when* and *how* to use the tool.
- **Parameters**: JSON Schema defining the expected inputs.
The LLM doesn't "run" the code; it generates a **Structured Call** (JSON) which the system then executes.`,
    why:
`The **Description** is the most important part of a skill. If the description is vague, the LLM will misapply the tool. Senior SDEs must treat Tool Definitions as "Prompt Engineering for Functions". Well-defined skills make agents reliable and predictable.`,
    example: {
      language: "javascript",
      code:
`// Skill Definition for an LLM
const SEARCH_SKILL = {
  name: "search_knowledge_base",
  description: "Search the study lab for topics related to Java, Go, or Python. Use this when the user asks for concepts, interview questions, or code examples.",
  parameters: {
    type: "object",
    properties: {
      topic: {
        type: "string",
        description: "The main topic to search for (e.g., 'Garbage Collection')."
      },
      limit: {
        type: "number",
        description: "Max results to return.",
        default: 3
      }
    },
    required: ["topic"]
  }
};

// Response from LLM when it wants to use this skill:
// { "tool": "search_knowledge_base", "parameters": { "topic": "JVM", "limit": 5 } }`,
      notes: `Always include 'examples' in the parameter descriptions to help the LLM understand the expected format of inputs (e.g., date formats, ID types).`
    },
    interview: [
      {
        question: "What is 'Tool Fatigue' in agents?",
        answer:
`**Tool Fatigue** occurs when an agent is provided with too many tools (e.g., 50+). The LLM's performance degrades: it gets confused about which tool to pick, hallucinate tool names, or forgets to use tools entirely. **Solution**: Use 'Tool Discovery' or group tools into 'Skillsets' that are injected into the prompt only when relevant.`,
        followUps: ["How do you handle tool execution errors?", "What is 'Self-Healing' tool calling?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Extends LLM capabilities infinitely.",
        "Allows for strict input validation via JSON Schema.",
        "Enables clear separation of concerns: LLM plans, Code executes."
      ],
      cons: [
        "Depends heavily on the quality of the 'Description'.",
        "LLMs can still 'hallucinate' tool calls if the prompt is weak.",
        "Complexity in managing tool dependencies and auth."
      ],
      when: `Use **Function Calling** (Skills) whenever the LLM needs to interact with an external system, perform a calculation, or access private data.`
    }
  };
  window.AGENT_TOPICS = (window.AGENT_TOPICS || []).concat([topic]);
})();
