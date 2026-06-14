import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MEDICAL_SYSTEM_PROMPT } from "@/lib/promptBuilder";

export const dynamic = "force-dynamic";

/**
 * Gemini API test route.
 * Uses MEDICAL_SYSTEM_PROMPT — any future Gemini MCQ generation
 * MUST use src/lib/medicalAI.ts (same boundary as Groq).
 */
export async function GET(request: NextRequest) {
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey) {
    return NextResponse.json(
      { 
        error: "GEMINI_API_KEY is not set in environment variables",
        hasKey: false 
      },
      { status: 500 }
    );
  }

  const genAI = new GoogleGenerativeAI(geminiApiKey);

  // Test different model names
  const modelsToTest = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-001",
    "models/gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-pro",
  ];

  const results: any[] = [];

  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'Hello' in one word.");
      const response = await result.response;
      const text = response.text();
      
      results.push({
        model: modelName,
        status: "success",
        response: text,
      });
      break; // Stop at first successful model
    } catch (error: any) {
      results.push({
        model: modelName,
        status: "failed",
        error: error.message,
        errorCode: error.code,
        errorStatus: error.status,
      });
    }
  }

  return NextResponse.json({
    hasApiKey: true,
    medicalBoundary: "MEDICAL_SYSTEM_PROMPT enforced via promptBuilder.ts / medicalAI.ts",
    systemPromptPreview: MEDICAL_SYSTEM_PROMPT.substring(0, 120) + "...",
    apiKeyLength: geminiApiKey.length,
    apiKeyPrefix: geminiApiKey.substring(0, 10) + "...",
    testedModels: results,
    recommendation: results.find(r => r.status === "success") 
      ? `Use model: ${results.find(r => r.status === "success")?.model}`
      : "None of the tested models worked. Check your API key and permissions.",
  });
}

