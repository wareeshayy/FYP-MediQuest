import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import {
  buildMedicalChatMessages,
  guardMedicalChatInput,
  guardMedicalChatOutput,
  MEDICAL_LLM_TEMPERATURE,
  MEDICAL_CHAT_MAX_TOKENS,
} from "@/lib/medicalAI";
import { OUT_OF_SCOPE_MESSAGE } from "@/lib/promptBuilder";
import { enrichChatContextWithRAG } from "@/lib/rag/enrich";

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.error("GROQ_API_KEY is not configured");
}

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!groq) {
    return NextResponse.json(
      { error: "Groq API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((msg: { role?: string }) => msg.role === "user");

    if (lastUserMessage?.content) {
      const blocked = guardMedicalChatInput(String(lastUserMessage.content));
      if (blocked) {
        return NextResponse.json({ response: blocked });
      }
    }

    const enrichedContext = lastUserMessage?.content
      ? await enrichChatContextWithRAG({
          query: String(lastUserMessage.content),
          existingContext: typeof context === "string" ? context : undefined,
        })
      : typeof context === "string"
        ? context
        : undefined;

    const groqMessages = buildMedicalChatMessages(messages, enrichedContext);

    const availableModels = [
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "llama-3.3-70b-versatile",
    ];

    let response;
    let lastError: unknown = null;

    for (const model of availableModels) {
      try {
        console.log(`🤖 Trying chat model: ${model}`);
        response = await groq.chat.completions.create({
          messages: groqMessages,
          model: model,
          temperature: MEDICAL_LLM_TEMPERATURE,
          max_tokens: MEDICAL_CHAT_MAX_TOKENS,
        });
        console.log(`✅ Successfully used model: ${model}`);
        break;
      } catch (error: unknown) {
        lastError = error;
        const message = error instanceof Error ? error.message : "Unknown error";
        console.warn(`❌ Model ${model} failed:`, message);
        if (message.includes("decommissioned") || message.includes("not found")) {
          continue;
        }
        throw error;
      }
    }

    if (!response) {
      const lastMessage =
        lastError instanceof Error ? lastError.message : "Unknown error";
      throw new Error(
        `All models failed. Last error: ${lastMessage}\n\n` +
          `Please check available models at https://console.groq.com/docs/models`
      );
    }

    const rawResponse =
      response.choices[0]?.message?.content || OUT_OF_SCOPE_MESSAGE;

    return NextResponse.json({
      response: guardMedicalChatOutput(rawResponse),
    });
  } catch (error: unknown) {
    console.error("Chat API error:", error);

    let errorMessage =
      error instanceof Error ? error.message : "Failed to process chat request";

    if (errorMessage.includes("decommissioned")) {
      errorMessage =
        "The AI model has been updated. Please refresh the page and try again.";
    } else if (errorMessage.includes("model") && errorMessage.includes("not found")) {
      errorMessage = "AI model not available. Please try again in a moment.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      errorMessage = "API rate limit reached. Please try again in a few moments.";
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
