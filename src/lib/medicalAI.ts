/**
 * MediQuest — Unified medical AI boundary layer.
 * ALL LLM providers (Groq, Gemini, OpenAI) MUST use these helpers.
 * Prompts & filters live in: src/lib/promptBuilder.ts
 */

import {
  MEDICAL_SYSTEM_PROMPT,
  MEDICAL_CHAT_SYSTEM_PROMPT,
  buildMCQPrompt,
  buildChatContext,
  validateTopic,
  validateChatMessage,
  filterMedicalMCQs,
  containsNonMedicalBlocklist,
  containsNonMedicalPattern,
  containsMedicalDomainSignal,
  MCQ_STRICT_RETRY_SUFFIX,
  OUT_OF_SCOPE_MESSAGE,
  type GeneratedMCQ,
  type BuildMCQPromptInput,
  type ValidateTopicOptions,
} from "@/lib/promptBuilder";

export type { GeneratedMCQ, BuildMCQPromptInput, ValidateTopicOptions };

export type LLMProvider = "groq" | "gemini" | "openai" | "medgemma" | "biogpt";

/** Active provider from .env — groq | medgemma | biogpt */
export function getMedicalAIProvider(): LLMProvider {
  const provider = (process.env.MEDICAL_AI_PROVIDER || "groq").toLowerCase();
  if (provider === "medgemma" || provider === "biogpt") return provider;
  if (provider === "gemini") return "gemini";
  if (provider === "openai") return "openai";
  return "groq";
}

export interface MedicalChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Layer 1+2: MCQ messages for any provider */
export function buildMedicalMCQMessages(
  input: BuildMCQPromptInput,
  strictRetry = false
): MedicalChatMessage[] {
  const userPrompt = buildMCQPrompt(input) + (strictRetry ? MCQ_STRICT_RETRY_SUFFIX : "");
  return [
    { role: "system", content: MEDICAL_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];
}

/** Layer 1: Pre-request topic guard */
export function guardMedicalTopic(
  topic: string,
  options: ValidateTopicOptions = {}
): string | null {
  const result = validateTopic(topic, options);
  return result.valid ? null : result.message || OUT_OF_SCOPE_MESSAGE;
}

/** Layer 1: Pre-request chat input guard */
export function guardMedicalChatInput(message: string): string | null {
  const result = validateChatMessage(message);
  return result.valid ? null : result.message || OUT_OF_SCOPE_MESSAGE;
}

/** Layer 2: Chat messages for any provider */
export function buildMedicalChatMessages(
  userMessages: Array<{ role: string; content: string }>,
  context?: string
): MedicalChatMessage[] {
  const systemPrompt = MEDICAL_CHAT_SYSTEM_PROMPT + buildChatContext(context);
  return [
    { role: "system", content: systemPrompt },
    ...userMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];
}

/** Layer 3: Post-generation MCQ filter */
export function enforceMedicalMCQs(questions: GeneratedMCQ[]): GeneratedMCQ[] {
  return filterMedicalMCQs(questions);
}

/** Layer 3: Post-generation chat output guard */
export function guardMedicalChatOutput(response: string): string {
  const check = validateChatMessage(response);
  if (!check.valid) return OUT_OF_SCOPE_MESSAGE;

  if (
    (containsNonMedicalBlocklist(response) || containsNonMedicalPattern(response)) &&
    !containsMedicalDomainSignal(response)
  ) {
    return OUT_OF_SCOPE_MESSAGE;
  }

  return response;
}

export const MEDICAL_LLM_TEMPERATURE = 0.2;
export const MEDICAL_MCQ_MAX_TOKENS = 4000;
export const MEDICAL_CHAT_MAX_TOKENS = 1000;
