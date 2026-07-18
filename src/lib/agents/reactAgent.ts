import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { agentTools, getToolByName } from "./tools";
import { AgentResponse, ExecutionStep } from "./types";

const geminiApiKey = process.env.GEMINI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

const MAX_ITERATIONS = 5;

// Construct descriptions of available tools for the prompt
const toolsListDescription = agentTools
  .map(t => `- **${t.name}**: ${t.description}\n  Parameters: ${t.parameters}`)
  .join("\n");

const REACT_SYSTEM_PROMPT = `You are "MediQuest AI" — a premium autonomous medical agent tutor for USMLE/PLAB preparation.

You have access to the following tools:
${toolsListDescription}

Your objective is to address the user's medical query. You MUST use a step-by-step reasoning cycle: Thought -> Action -> Action Input -> Observation.
You must respond using EXACTLY this format:

Thought: Write what you need to do next, what information is missing, or how you plan to analyze the input.
Action: The tool name to invoke (must be one of: [search_medical_rag, retrieve_user_profile, search_pharmacology, calculate_medical_formula]).
Action Input: The arguments for the tool in JSON format (e.g. {"query": "symptoms of DKA"}).

Wait for the system to run the tool and return the Observation. Then write:

Thought: Analyze the Observation and decide what to do next.
(Repeat Thought/Action/Action Input/Observation if needed, up to 5 times)

Once you have all the information required, output:
Thought: I have retrieved all necessary information to solve the user request.
Final Answer: [Write your final comprehensive answer here. Provide deep medical explanations, cite RAG sources if used, and offer personalized study tips.]

CRITICAL RULES:
1. ONLY write ONE Thought and ONE Action/Action Input block in a single turn. Do not write the Observation yourself.
2. If the user asks a general or non-medical question, DO NOT call any tools. Jump directly to Final Answer and state: "I can only assist with USMLE/PLAB medical exam preparation and medical MCQs."
3. If you can answer the question immediately from your memory or from the context, do not invoke tools. Go straight to Final Answer.
4. Keep JSON in Action Input valid. Double-quote keys and strings.
`;

function extractBalancedJson(text: string): any {
  const startIdx = text.indexOf("{");
  if (startIdx === -1) return undefined;
  
  let braceCount = 0;
  for (let i = startIdx; i < text.length; i++) {
    if (text[i] === "{") braceCount++;
    else if (text[i] === "}") {
      braceCount--;
      if (braceCount === 0) {
        const jsonStr = text.substring(startIdx, i + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          try {
            return eval(`(${jsonStr})`);
          } catch (inner) {
            // ignore
          }
        }
      }
    }
  }
  return undefined;
}

function parseReActResponse(text: string): {
  thought: string;
  action?: string;
  actionInput?: any;
  finalAnswer?: string;
} {
  const thoughtMatch = text.match(/Thought:\s*([\s\S]*?)(?:Action:|$|Final Answer:)/i);
  const actionMatch = text.match(/Action:\s*([a-zA-Z_0-9]+)/i);
  const finalAnswerMatch = text.match(/Final Answer:\s*([\s\S]*)$/i);

  const thought = thoughtMatch ? thoughtMatch[1].trim() : "Thinking...";
  const action = actionMatch ? actionMatch[1].trim() : undefined;
  
  let actionInput = undefined;
  const actionInputIdx = text.toLowerCase().indexOf("action input:");
  if (actionInputIdx !== -1) {
    const actionInputSubstring = text.substring(actionInputIdx + "action input:".length);
    actionInput = extractBalancedJson(actionInputSubstring);
  }

  const finalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : undefined;

  return { thought, action, actionInput, finalAnswer };
}

/**
 * Execute LLM call with fallbacks (Gemini -> Groq)
 */
async function callLLM(prompt: string, systemPrompt: string, history: { role: string; content: string }[]): Promise<string> {
  const formattedHistory = history.map(h => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n");
  const fullPrompt = `${systemPrompt}\n\nChat History:\n${formattedHistory}\n\nNext User Message or Observation:\n${prompt}\n\n`;

  // 1. Try Gemini first (highly robust reasoning)
  if (genAI) {
    try {
      console.log("🤖 Running ReAct step with Gemini...");
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: { temperature: 0.1 }
      });
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      return text;
    } catch (err: any) {
      console.warn("⚠️ Gemini failed in agent loop, trying Groq fallback...", err.message);
    }
  }

  // 2. Try Groq fallback
  if (groq) {
    try {
      console.log("🤖 Running ReAct step with Groq...");
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: prompt }
      ];
      
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.3-70b-versatile",
        temperature: 0.1
      });
      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      console.error("❌ Groq failed too in agent loop:", err.message);
      throw err;
    }
  }

  throw new Error("No AI API providers are configured. Set GEMINI_API_KEY or GROQ_API_KEY.");
}

/**
 * Runs the ReAct execution loop autonomously
 */
export async function runReactAgent(
  userQuery: string,
  history: { role: string; content: string }[] = [],
  userId?: string
): Promise<AgentResponse> {
  console.log(`🚀 Starting ReAct Agent for query: "${userQuery}" (User ID: ${userId || "none"})`);
  
  const steps: ExecutionStep[] = [];
  let currentPrompt = userQuery;
  let iteration = 0;

  // Pre-seed user query with user profile if available, to make the agent aware of the student's profile context from step 1
  if (userId && iteration === 0) {
    const profileTool = getToolByName("retrieve_user_profile");
    if (profileTool) {
      console.log("📝 Pre-retrieving user profile for session memory context...");
      try {
        const profileData = await profileTool.execute({}, userId);
        currentPrompt = `[User Context Profile: ${profileData}]\n\nUser Query: ${userQuery}`;
      } catch (err) {
        console.warn("Could not pre-load user profile:", err);
      }
    }
  }

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n--- ReAct Loop Iteration ${iteration}/${MAX_ITERATIONS} ---`);
    
    let rawResponse = "";
    try {
      rawResponse = await callLLM(currentPrompt, REACT_SYSTEM_PROMPT, history);
    } catch (err: any) {
      return {
        response: `I'm sorry, I encountered an error running the AI reasoning loop: ${err.message}`,
        steps
      };
    }

    console.log("Raw LLM Output:\n", rawResponse);

    const parsed = parseReActResponse(rawResponse);
    
    // Record step
    const step: ExecutionStep = {
      thought: parsed.thought,
      action: parsed.action,
      actionInput: parsed.actionInput
    };

    if (parsed.action) {
      const tool = getToolByName(parsed.action);
      if (tool) {
        console.log(`🔧 Executing tool: ${parsed.action} with input:`, parsed.actionInput);
        let observationResult = "";
        try {
          observationResult = await tool.execute(parsed.actionInput, userId);
        } catch (toolErr: any) {
          observationResult = `Tool execution failed: ${toolErr.message}`;
        }
        
        console.log(`👁️ Observation:`, observationResult.substring(0, 300) + (observationResult.length > 300 ? "..." : ""));
        step.observation = observationResult;
        steps.push(step);

        // Feedback observation into the next prompt
        currentPrompt = `Observation: ${observationResult}`;
      } else {
        const obs = `Error: Tool "${parsed.action}" does not exist. Choose from: [search_medical_rag, retrieve_user_profile, search_pharmacology, calculate_medical_formula]`;
        console.warn(obs);
        step.observation = obs;
        steps.push(step);
        currentPrompt = `Observation: ${obs}`;
      }
    } else {
      // No action, treat as final answer or fallback
      const finalAns = parsed.finalAnswer || rawResponse.replace(/Thought:[\s\S]*?$/i, "").trim();
      steps.push({
        thought: parsed.thought,
        observation: "Final answer reached."
      });
      
      console.log("✅ Final Answer reached!");
      return {
        response: finalAns,
        steps
      };
    }
  }

  // If we exceeded loop limits, make a final attempt to resolve the answer
  console.warn("⚠️ ReAct loop exceeded maximum iterations. Returning last response.");
  return {
    response: "I'm sorry, but I was unable to resolve your question within my logical bounds. Please refine your query.",
    steps
  };
}
