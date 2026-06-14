import { NextResponse } from "next/server";
import { callHuggingFaceMedicalLLM, isHuggingFaceConfigured } from "@/lib/huggingface";
import {
  HF_MODEL_MEDGEMMA,
  HF_MODEL_BIOGPT,
  HF_MODEL_PUBMEDBERT,
  getHuggingFaceInferenceUrl,
} from "@/lib/hf-models";
import { MEDICAL_SYSTEM_PROMPT } from "@/lib/promptBuilder";

export const dynamic = "force-dynamic";

/**
 * Test Hugging Face medical models (MedGemma primary).
 * GET /api/test-huggingface
 */
export async function GET() {
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_API_TOKEN;

  if (!apiKey) {
    return NextResponse.json(
      {
        configured: false,
        error: "HUGGINGFACE_API_KEY is not set in .env.local",
        hint: "Create token at https://huggingface.co/settings/tokens",
      },
      { status: 500 }
    );
  }

  const models = {
    medgemma: {
      id: HF_MODEL_MEDGEMMA,
      url: getHuggingFaceInferenceUrl(HF_MODEL_MEDGEMMA),
      purpose: "USMLE MCQs & medical chat (primary)",
    },
    biogpt: {
      id: HF_MODEL_BIOGPT,
      url: getHuggingFaceInferenceUrl(HF_MODEL_BIOGPT),
      purpose: "Biomedical text (secondary, not instruction-tuned)",
    },
    pubmedbert: {
      id: HF_MODEL_PUBMEDBERT,
      url: getHuggingFaceInferenceUrl(HF_MODEL_PUBMEDBERT),
      purpose: "Understanding only — NOT for MCQ generation",
    },
  };

  if (!isHuggingFaceConfigured()) {
    return NextResponse.json({ configured: false, models }, { status: 500 });
  }

  try {
    const response = await callHuggingFaceMedicalLLM(
      [
        { role: "system", content: MEDICAL_SYSTEM_PROMPT },
        {
          role: "user",
          content:
            'Reply with one word only: "ready" if you can assist with USMLE medical exam prep.',
        },
      ],
      { model: "medgemma", maxNewTokens: 32 }
    );

    return NextResponse.json({
      configured: true,
      provider: process.env.MEDICAL_AI_PROVIDER || "groq",
      apiKeyPrefix: apiKey.substring(0, 8) + "...",
      medicalBoundary: "MEDICAL_SYSTEM_PROMPT via promptBuilder.ts",
      models,
      medgemmaTest: {
        status: "success",
        responsePreview: response.slice(0, 200),
      },
      note: "There is no MedCama AI on Hugging Face — MediQuest uses MedGemma.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "MedGemma test failed";
    return NextResponse.json(
      {
        configured: true,
        models,
        medgemmaTest: { status: "failed", error: message },
        hint: "Model may be loading (503). Wait 30–60s and retry.",
      },
      { status: 502 }
    );
  }
}
