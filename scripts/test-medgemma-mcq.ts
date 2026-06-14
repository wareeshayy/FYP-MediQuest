/**
 * Standalone test: MedGemma MCQ generation via Hugging Face
 * Run: npx tsx scripts/test-medgemma-mcq.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local without dotenv package
try {
  const envPath = resolve(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  console.warn("Could not load .env.local");
}

import { buildMedicalMCQMessages } from "../src/lib/medicalAI";
import { callHuggingFaceMedicalLLMDetailed } from "../src/lib/huggingface";

async function main() {
  console.log("Provider:", process.env.MEDICAL_AI_PROVIDER);
  console.log("HF key set:", Boolean(process.env.HUGGINGFACE_API_KEY));
  console.log("Model:", process.env.HF_MODEL_MEDGEMMA);
  console.log("\nGenerating 2 USMLE MCQs on Cardiology via MedGemma...\n");

  const messages = buildMedicalMCQMessages({
    topic: "Cardiology",
    difficulty: "medium",
    numberOfQuestions: 2,
    sourceType: "text",
  });

  const start = Date.now();
  const { text: response, modelUsed, provider } = await callHuggingFaceMedicalLLMDetailed(
    messages,
    { model: "medgemma", maxNewTokens: 2000 }
  );
  console.log(`Model used: ${modelUsed}${provider ? ` (${provider})` : ""}`);
  console.log(`Done in ${((Date.now() - start) / 1000).toFixed(1)}s\n`);
  console.log("--- MedGemma response ---");
  console.log(response);
}

main().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});
