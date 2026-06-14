/**
 * Hugging Face medical model registry.
 * One HF token (HUGGINGFACE_API_KEY) works for all models.
 */

export const HF_INFERENCE_BASE_URL =
  process.env.HF_INFERENCE_BASE_URL ||
  "https://router.huggingface.co/hf-inference/models";

/**
 * Preferred — requires Inference Provider support (often unavailable on free tier).
 * Accept Health AI terms: https://huggingface.co/google/medgemma-4b-it
 */
export const HF_MODEL_MEDGEMMA =
  process.env.HF_MODEL_MEDGEMMA || "google/medgemma-4b-it";

/**
 * HF Inference fallback — medical MCQs via text generation (works on free tier).
 */
export const HF_MODEL_MEDALPACA =
  process.env.HF_MODEL_MEDALPACA || "medalpaca/medalpaca-7b";

/** Secondary — biomedical text (often no inference provider) */
export const HF_MODEL_BIOGPT =
  process.env.HF_MODEL_BIOGPT || "microsoft/biogpt";

/** Understanding only — NOT for MCQ generation */
export const HF_MODEL_PUBMEDBERT =
  process.env.HF_MODEL_PUBMEDBERT ||
  "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext";

export const HF_MEDALPACA_PROVIDER =
  process.env.HF_MEDALPACA_PROVIDER || "featherless-ai";

export type HuggingFaceMedicalModel = "medgemma" | "medalpaca" | "biogpt";

export function resolveHuggingFaceModelId(model: HuggingFaceMedicalModel): string {
  if (model === "biogpt") return HF_MODEL_BIOGPT;
  if (model === "medalpaca") return HF_MODEL_MEDALPACA;
  return HF_MODEL_MEDGEMMA;
}

export function getHuggingFaceInferenceUrl(modelId: string): string {
  return `${HF_INFERENCE_BASE_URL}/${modelId}`;
}
