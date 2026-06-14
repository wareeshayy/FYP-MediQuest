import { NextResponse } from "next/server";
import {
  buildMedicalMCQMessages,
  enforceMedicalMCQs,
  getMedicalAIProvider,
} from "@/lib/medicalAI";
import { callHuggingFaceMedicalLLMDetailed, isHuggingFaceConfigured } from "@/lib/huggingface";
import { HF_MODEL_MEDGEMMA } from "@/lib/hf-models";
import { formatQuizError } from "@/lib/formatQuizError";

export const dynamic = "force-dynamic";

/**
 * Generate sample USMLE MCQs using MedGemma (Hugging Face).
 * GET /api/test-medgemma-mcq?topic=Cardiology&count=2
 */
export async function GET(request: Request) {
  if (!isHuggingFaceConfigured()) {
    return NextResponse.json(
      { error: "HUGGINGFACE_API_KEY is not set in .env.local" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic") || "Cardiology";
  const count = Math.min(parseInt(searchParams.get("count") || "2", 10), 5);

  const messages = buildMedicalMCQMessages({
    topic,
    difficulty: "medium",
    numberOfQuestions: count,
    sourceType: "text",
  });

  try {
    const start = Date.now();
    const { text: raw, modelUsed, provider } = await callHuggingFaceMedicalLLMDetailed(
      messages,
      { model: "medgemma", maxNewTokens: 2500 }
    );

    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(raw);
    const questions = enforceMedicalMCQs(Array.isArray(parsed) ? parsed : []);

    return NextResponse.json({
      success: true,
      aiProvider: getMedicalAIProvider(),
      hfModel: modelUsed,
      hfInferenceProvider: provider,
      topic,
      elapsedMs: Date.now() - start,
      rawLength: raw.length,
      questionsGenerated: questions.length,
      questions,
      note:
        modelUsed !== HF_MODEL_MEDGEMMA
          ? "MedGemma is not on HF free Inference Providers; used MedAlpaca fallback."
          : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "MedGemma MCQ generation failed";
    return NextResponse.json(
      {
        success: false,
        model: HF_MODEL_MEDGEMMA,
        error: formatQuizError(message),
        tokenFix:
          "Create fine-grained token at https://huggingface.co/settings/tokens with 'Make calls to Inference Providers'.",
      },
      { status: 502 }
    );
  }
}
