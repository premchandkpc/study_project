(function() {
  var topic = {
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
  };
  window.AGENT_TOPICS = (window.AGENT_TOPICS || []).concat([topic]);
})();
