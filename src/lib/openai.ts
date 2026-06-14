import OpenAI from "openai";

/**
 * OpenAI client — if used for MCQ/chat, MUST go through src/lib/medicalAI.ts
 * for USMLE-only prompts and medical boundary enforcement.
 */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export default openai;
