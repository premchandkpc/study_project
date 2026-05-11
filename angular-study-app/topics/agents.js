/* ===== AI Agents & MCP curriculum — mentor-grade, topic-wise ===== */
window.AGENT_TOPICS = [
  {
    id: "agent-reasoning-react",
    area: "agents",
    title: "Agent Reasoning: ReAct Pattern (Reason + Act)",
    tag: "Reasoning",
    tags: ["agent", "react", "llm", "reasoning", "chain of thought"],
    concept:
`The **ReAct** (Reason + Act) pattern is the foundation of modern autonomous agents. It combines:
- **Reasoning**: The LLM generates a "Thought" describing what it needs to do.
- **Acting**: The LLM selects a "Tool" to execute based on the thought.
- **Observing**: The result of the action is fed back into the prompt as an "Observation".
The loop repeats until the LLM decides it has the final answer. This prevents the LLM from "hallucinating" facts by forcing it to verify information via tools.`,
    why:
`LLMs are excellent at language but lack real-time data or computational precision. ReAct allows them to **interact with the world** (search, APIs, databases). It turns a "static" model into a "dynamic" problem solver. For Senior SDEs, understanding the control loop of an agent is key to building reliable AI systems.`,
    example: {
      language: "python",
      code:
`# Simplified ReAct Loop in Python
import json

class Agent:
    def __init__(self, model, tools):
        self.model = model
        self.tools = tools

    def run(self, task):
        history = [f"Task: {task}"]
        for _ in range(5):  # Max 5 iterations
            prompt = "\n".join(history) + "\nThought:"
            response = self.model.generate(prompt) # "Thought: ... Action: {tool: 'X', input: 'Y'}"
            
            thought, action = self.parse_response(response)
            print(f"Agent Thought: {thought}")
            
            if not action:
                return thought # Final Answer

            # Execute Tool
            tool_name = action['tool']
            tool_input = action['input']
            observation = self.tools[tool_name](tool_input)
            
            print(f"Action: {tool_name}({tool_input}) -> {observation}")
            history.append(f"Thought: {thought}\nAction: {json.dumps(action)}\nObservation: {observation}")

# Example Tool
def get_weather(city):
    return "22°C, Partly Cloudy"

agent = Agent(model_stub, {"get_weather": get_weather})
agent.run("What is the weather in London?")`,
      notes: `In production, use frameworks like **LangChain**, **CrewAI**, or **AutoGPT** which provide robust ReAct implementations and error handling for malformed actions.`
    },
    interview: [
      {
        question: "How do you prevent an agent from getting into an infinite loop?",
        answer:
`1. **Max Iterations**: Hard limit on the number of ReAct loops (e.g., 5-10). 
2. **Context Window Management**: As history grows, old observations must be summarized or truncated to stay within token limits. 
3. **Loop Detection**: Check if the agent is repeating the same Thought/Action pair and inject a "System Message" to nudge it towards a different path.`,
        followUps: ["What is the cost implication of long ReAct loops?", "How does self-correction work in agents?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Grounds LLM responses in real-world data (Observation).",
        "Transparent reasoning process (Thought) for debugging.",
        "Modular: tools can be added or removed without retraining."
      ],
      cons: [
        "Higher latency due to multiple LLM calls.",
        "Token usage increases with every loop iteration.",
        "Fragile: Malformed tool outputs can break the reasoning chain."
      ],
      when: `Use **ReAct** when the task requires multi-step logic and external data. Use simple **Zero-Shot** prompting if the task is purely linguistic or the data is already in context.`
    }
  },

  {
    id: "agent-mcp-protocol",
    area: "agents",
    title: "MCP: Model Context Protocol",
    tag: "Protocol",
    tags: ["mcp", "anthropic", "context", "protocol", "interoperability"],
    concept:
`**Model Context Protocol (MCP)** is an open standard that enables AI models to connect seamlessly to data sources and tools. 
- **MCP Servers**: Expose resources (files, DBs) and tools (APIs, functions).
- **MCP Clients**: (like IDEs or Agents) consume these servers.
It standardizes how context is fetched, allowing one "Skill" to work across different AI models (Claude, GPT, Gemini). It’s essentially "USB for AI models".`,
    why:
`Before MCP, every integration was custom (e.g., a specific plugin for ChatGPT). MCP allows developers to build a **capability once** and use it everywhere. It solves the "context fragmentation" problem in agentic workflows. For SDEs, it's the standard for building "pluggable" AI features.`,
    example: {
      language: "javascript",
      code:
`// Example MCP Server (Conceptual)
import { McpServer } from "@modelcontextprotocol/sdk";

const server = new McpServer({
  name: "StudyLabTools",
  version: "1.0.0"
});

// Register a "Tool" (Skill)
server.tool(
  "search_java_topics",
  { query: "string" },
  async ({ query }) => {
    const results = await db.search(query);
    return {
      content: [{ type: "text", text: JSON.stringify(results) }]
    };
  }
);

// MCP clients can now 'discover' and 'call' this tool
server.start();`,
      notes: `MCP is heavily used in IDEs like **Cursor** or **Windsurf** to give the AI access to the filesystem and terminal in a standardized way.`
    },
    interview: [
      {
        question: "How does MCP differ from traditional REST APIs?",
        answer:
`REST is for human-to-machine or machine-to-machine. **MCP** is optimized for **machine-to-model**. It includes metadata specifically for LLMs: descriptions of tools, resource schemas, and structured prompts. It’s a higher-level abstraction that encompasses discovery, context fetching, and tool execution in one protocol.`,
        followUps: ["What are 'Resources' in MCP?", "How do 'Prompts' work as a feature in MCP?"]
      }
    ],
    tradeoffs: {
      pros: [
        "Interoperability: build once, use across multiple AI models.",
        "Standardized discovery: agents can 'browse' available skills.",
        "Security: standard ways to handle permissions and auth."
      ],
      cons: [
        "New standard, ecosystem still maturing.",
        "Adds another layer of abstraction/latency.",
        "Requires specific SDK support in the client."
      ],
      when: `Use **MCP** when building tools that need to be shared across different AI clients or when building a platform that hosts many pluggable AI capabilities.`
    }
  },

  {
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
  }
];
