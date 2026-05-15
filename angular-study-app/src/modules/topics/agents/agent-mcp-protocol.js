(function() {
  var topic = {
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
  };
  window.AGENT_TOPICS = (window.AGENT_TOPICS || []).concat([topic]);
})();
