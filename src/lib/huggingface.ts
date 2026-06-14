/**
 * Hugging Face Inference API — MedGemma / MedAlpaca / BioGPT
 * Token: fine-grained with "Make calls to Inference Providers"
 */

import { InferenceClient, type InferenceProviderOrPolicy } from "@huggingface/inference";
import {
  resolveHuggingFaceModelId,
  HF_MODEL_MEDGEMMA,
  HF_MODEL_MEDALPACA,
  HF_MEDALPACA_PROVIDER,
  type HuggingFaceMedicalModel,
} from "@/lib/hf-models";
import type { MedicalChatMessage } from "@/lib/medicalAI";
import { MEDICAL_LLM_TEMPERATURE, MEDICAL_MCQ_MAX_TOKENS } from "@/lib/medicalAI";

export interface HuggingFaceCallResult {
  text: string;
  modelUsed: string;
  provider?: string;
}

export function getHuggingFaceApiKey(): string | undefined {
  return process.env.HUGGINGFACE_API_KEY || process.env.HF_API_TOKEN;
}

export function isHuggingFaceConfigured(): boolean {
  return Boolean(getHuggingFaceApiKey());
}

export interface HuggingFaceInferenceOptions {
  model?: HuggingFaceMedicalModel;
  maxNewTokens?: number;
  temperature?: number;
}

function getInferenceClient(): InferenceClient {
  const apiKey = getHuggingFaceApiKey();
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_KEY is not configured in .env.local");
  }
  return new InferenceClient(apiKey);
}

function messagesToPrompt(messages: MedicalChatMessage[]): string {
  return messages
    .map((m) => {
      const label =
        m.role === "system" ? "System" : m.role === "user" ? "User" : "Assistant";
      return `${label}:\n${m.content}`;
    })
    .join("\n\n");
}

function isMedGemmaUnavailable(error: unknown): boolean {
  const err = error as {
    httpResponse?: { body?: { error?: { code?: string; message?: string } } };
    message?: string;
  };
  const code = err.httpResponse?.body?.error?.code;
  const message =
    err.httpResponse?.body?.error?.message || err.message || "";
  return (
    code === "model_not_supported" ||
    message.includes("not supported by any provider") ||
    message.includes("No Inference Provider available")
  );
}

function formatHuggingFaceError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("sufficient permissions") ||
    message.includes("Inference Providers")
  ) {
    return (
      "Hugging Face token lacks Inference permission. Create a fine-grained token at " +
      "https://huggingface.co/settings/tokens with 'Make calls to Inference Providers' enabled."
    );
  }
  if (message.includes("loading")) {
    return "Model is loading on Hugging Face. Wait 30–60 seconds and try again.";
  }
  return message;
}

async function callMedGemmaChat(
  client: InferenceClient,
  messages: MedicalChatMessage[],
  options: HuggingFaceInferenceOptions
): Promise<HuggingFaceCallResult> {
  const response = await client.chatCompletion({
    model: HF_MODEL_MEDGEMMA,
    messages: messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    max_tokens: options.maxNewTokens ?? Math.min(MEDICAL_MCQ_MAX_TOKENS, 2048),
    temperature: options.temperature ?? MEDICAL_LLM_TEMPERATURE,
  });

  const content = response.choices[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error("MedGemma returned an empty response");
  }
  return { text: content, modelUsed: HF_MODEL_MEDGEMMA };
}

async function callMedAlpaca(
  client: InferenceClient,
  messages: MedicalChatMessage[],
  options: HuggingFaceInferenceOptions
): Promise<HuggingFaceCallResult> {
  const provider = HF_MEDALPACA_PROVIDER as InferenceProviderOrPolicy;
  const userMessage = messages.find((m) => m.role === "user")?.content || "";
  // MedAlpaca works best with a shorter USMLE-focused prompt (full system prompt is too long)
  const prompt =
    "You are a USMLE Step 1 MCQ generator. Return ONLY a JSON array of medical MCQs.\n\n" +
    userMessage;

  const response = await client.textGeneration({
    model: HF_MODEL_MEDALPACA,
    inputs: prompt,
    parameters: {
      max_new_tokens: options.maxNewTokens ?? Math.min(MEDICAL_MCQ_MAX_TOKENS, 2048),
      temperature: options.temperature ?? MEDICAL_LLM_TEMPERATURE,
      return_full_text: true,
    },
    provider,
  });

  let text = response.generated_text?.trim() || "";
  if (text.startsWith(prompt)) {
    text = text.slice(prompt.length).trim();
  }
  if (!text) {
    throw new Error("MedAlpaca returned an empty response");
  }

  console.log(`✅ Hugging Face MCQs via ${HF_MODEL_MEDALPACA} (${provider})`);
  return {
    text,
    modelUsed: HF_MODEL_MEDALPACA,
    provider: String(provider),
  };
}

async function callBioGPT(
  client: InferenceClient,
  messages: MedicalChatMessage[],
  options: HuggingFaceInferenceOptions
): Promise<HuggingFaceCallResult> {
  const modelId = resolveHuggingFaceModelId("biogpt");
  const prompt = messagesToPrompt(messages);

  const response = await client.textGeneration({
    model: modelId,
    inputs: prompt,
    parameters: {
      max_new_tokens: options.maxNewTokens ?? 1500,
      temperature: options.temperature ?? MEDICAL_LLM_TEMPERATURE,
      return_full_text: false,
    },
  });

  const text = response.generated_text?.trim();
  if (!text) {
    throw new Error("BioGPT returned an empty response");
  }
  return { text, modelUsed: modelId };
}

/**
 * Call Hugging Face medical model for USMLE MCQ generation.
 * MedGemma → MedAlpaca fallback when MedGemma has no inference provider.
 */
export async function callHuggingFaceMedicalLLM(
  messages: MedicalChatMessage[],
  options: HuggingFaceInferenceOptions = {}
): Promise<string> {
  const result = await callHuggingFaceMedicalLLMDetailed(messages, options);
  return result.text;
}

export async function callHuggingFaceMedicalLLMDetailed(
  messages: MedicalChatMessage[],
  options: HuggingFaceInferenceOptions = {}
): Promise<HuggingFaceCallResult> {
  const client = getInferenceClient();
  const modelKey = options.model || "medgemma";

  try {
    if (modelKey === "medalpaca") {
      return await callMedAlpaca(client, messages, options);
    }
    if (modelKey === "biogpt") {
      return await callBioGPT(client, messages, options);
    }

    try {
      const result = await callMedGemmaChat(client, messages, options);
      console.log(`✅ Hugging Face MCQs via ${HF_MODEL_MEDGEMMA}`);
      return result;
    } catch (medgemmaError: unknown) {
      if (!isMedGemmaUnavailable(medgemmaError)) {
        throw medgemmaError;
      }
      console.warn(
        `⚠️ ${HF_MODEL_MEDGEMMA} not on HF Inference Providers — using ${HF_MODEL_MEDALPACA}`
      );
      return await callMedAlpaca(client, messages, options);
    }
  } catch (error: unknown) {
    throw new Error(formatHuggingFaceError(error));
  }
}
