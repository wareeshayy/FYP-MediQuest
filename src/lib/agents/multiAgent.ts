import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { OUT_OF_SCOPE_MESSAGE } from "@/lib/promptBuilder";

const geminiApiKey = process.env.GEMINI_API_KEY;
const groqApiKey = process.env.GROQ_API_KEY;

const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

/**
 * Call the helper LLM model
 */
async function callHelperLLM(prompt: string, systemPrompt: string): Promise<string> {
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`${systemPrompt}\n\nInput Content:\n${prompt}`);
      return result.response.text();
    } catch (e) {
      // ignore, fallback to groq
    }
  }

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.1
      });
      return completion.choices[0]?.message?.content || "";
    } catch (e) {
      // ignore
    }
  }

  throw new Error("No AI providers configured for helper agent call.");
}

/**
 * 1. Chat Safety & Quality Critic Agent
 * Checks the tutor's final output before sending to the student.
 * Blocks non-medical topics, hallucinatory general advice, or leaks of system prompts.
 */
export async function safetyCriticAgent(
  responseContent: string,
  userQuery: string
): Promise<string> {
  console.log("🕵️ safetyCriticAgent: Analyzing response for safety and domain bounds...");
  
  const systemPrompt = `You are a strict Medical Safety & Domain Quality Control Agent for a USMLE/PLAB tutoring platform.
Your job is to analyze the tutoring response for the given user query.

Determine if the response complies with these guidelines:
1. Topic must be STRICTLY medical or USMLE/PLAB prep.
2. The response must NOT answer non-medical questions (like computer science, math, coding, politics, etc.).
3. The response must NOT give real patient treatment advice (must remain educational/preparatory).
4. The response must NOT contain system prompt leaks.

If the response violates any of the rules, you MUST output exactly:
"I can only assist with USMLE/PLAB medical exam preparation and medical MCQs."

If the response is compliant, output the response exactly as is, without any edits, headers, or markdown comments. Do not add "Safety Approved" or prefix anything. Just output the original text.`;

  const reviewInput = `User Query: ${userQuery}\n\nTutoring Response:\n${responseContent}`;
  
  try {
    const evaluation = await callHelperLLM(reviewInput, systemPrompt);
    const cleaned = evaluation.trim();
    
    if (cleaned.includes(OUT_OF_SCOPE_MESSAGE) || cleaned === OUT_OF_SCOPE_MESSAGE) {
      console.warn("🚫 safetyCriticAgent rejected the tutor response as out-of-scope.");
      return OUT_OF_SCOPE_MESSAGE;
    }
    
    return responseContent;
  } catch (error) {
    console.error("safetyCriticAgent check failed, falling back to original response:", error);
    return responseContent;
  }
}

/**
 * 2. MCQ Evaluator / Critic Agent
 * Reviews a list of generated MCQs, verifies their structure, and attempts self-correction.
 */
export interface MCQCheckResult {
  valid: boolean;
  correctedQuestions: any[];
  feedback?: string;
}

export async function mcqCriticAgent(
  questions: any[],
  topic: string
): Promise<MCQCheckResult> {
  console.log(`🕵️ mcqCriticAgent: Evaluating ${questions.length} generated MCQs for topic "${topic}"...`);
  
  const correctedQuestions: any[] = [];
  let errorMessages: string[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const indexStr = `Question ${i + 1}`;

    // 1. Basic structural checks
    if (!q.question_text || !q.options || !Array.isArray(q.options)) {
      errorMessages.push(`${indexStr} has missing fields: question_text or options.`);
      continue;
    }

    if (q.options.length !== 4) {
      errorMessages.push(`${indexStr} does not have exactly 4 options. Found: ${q.options.length}`);
      continue;
    }

    // 2. Correct option validation & normalization
    let correctOption = q.correct_option;
    if (correctOption === undefined || correctOption === null) {
      errorMessages.push(`${indexStr} is missing correct_option.`);
      continue;
    }

    let normalizedCorrectOption = String(correctOption).trim();
    let isCorrectOptionValid = false;

    // Is it an index?
    if (!isNaN(Number(normalizedCorrectOption))) {
      const idx = Number(normalizedCorrectOption);
      if (idx >= 0 && idx < 4) {
        normalizedCorrectOption = q.options[idx];
        isCorrectOptionValid = true;
      }
    } 
    // Is it a letter index?
    else if (normalizedCorrectOption.length === 1 && /^[A-D]$/i.test(normalizedCorrectOption)) {
      const idx = normalizedCorrectOption.toUpperCase().charCodeAt(0) - 65;
      if (idx >= 0 && idx < 4) {
        normalizedCorrectOption = q.options[idx];
        isCorrectOptionValid = true;
      }
    } 
    // Is it matching the text of one of the options?
    else {
      const matched = q.options.find((opt: string) => opt.toLowerCase().trim() === normalizedCorrectOption.toLowerCase());
      if (matched) {
        normalizedCorrectOption = matched;
        isCorrectOptionValid = true;
      }
    }

    if (!isCorrectOptionValid) {
      errorMessages.push(`${indexStr} correct_option ("${correctOption}") does not match any of the options: ${q.options.join(", ")}`);
      continue;
    }

    // 3. Clinical Vignette checking
    const textLower = q.question_text.toLowerCase();
    const hasClinicalVignette = textLower.includes("presents with") || 
                                textLower.includes("year-old") || 
                                textLower.includes("history of") || 
                                textLower.includes("examination shows") ||
                                textLower.includes("laboratory findings");

    // Add warning but don't fail immediately unless strict clinical vignetting is required
    if (!hasClinicalVignette) {
      console.warn(`⚠️ ${indexStr} does not seem to contain a clinical vignette.`);
    }

    correctedQuestions.push({
      question_text: q.question_text,
      options: q.options,
      correct_option: normalizedCorrectOption,
      explanation: q.explanation || "No explanation provided.",
      difficulty: q.difficulty || "medium"
    });
  }

  if (errorMessages.length > 0) {
    console.error("❌ MCQ Critic found validation errors:", errorMessages);
    return {
      valid: false,
      correctedQuestions: [],
      feedback: errorMessages.join("\n")
    };
  }

  console.log("✅ MCQ Critic approved all questions.");
  return {
    valid: true,
    correctedQuestions
  };
}
