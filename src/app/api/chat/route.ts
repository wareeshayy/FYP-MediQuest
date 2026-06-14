import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  console.error("GROQ_API_KEY is not configured");
}

const groq = groqApiKey ? new Groq({ apiKey: groqApiKey }) : null;

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

    // Build system prompt with context
    let systemPrompt = "You are a helpful AI assistant for SmartPrep AI. ";
    
    // Check if context indicates quiz creation or learning
    if (context && context.includes("creating a quiz")) {
      // On create quiz page
      systemPrompt += "You are helping a user create quizzes. Provide helpful suggestions for topics, content improvement, quiz ideas, and educational guidance. Be friendly and encouraging.";
    } else {
      // On review page or general learning
      systemPrompt += "Provide clear, educational explanations and help students understand concepts better. Be friendly and encouraging.";
    }
    
    if (context) {
      systemPrompt += `\n\nContext:\n${context}`;
    }

    // Convert messages to Groq format
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Use currently available Groq models (updated to avoid decommissioned models)
    const availableModels = [
      "llama-3.1-8b-instant",      // Fast, reliable model
      "mixtral-8x7b-32768",        // Alternative high-quality option
      "llama-3.3-70b-versatile",  // If available, newer 70b model
    ];

    let response;
    let lastError: any = null;

    // Try each model until one works
    for (const model of availableModels) {
      try {
        console.log(`🤖 Trying chat model: ${model}`);
        response = await groq.chat.completions.create({
          messages: groqMessages,
          model: model,
          temperature: 0.7,
          max_tokens: 1000,
        });
        console.log(`✅ Successfully used model: ${model}`);
        break;
      } catch (error: any) {
        lastError = error;
        console.warn(`❌ Model ${model} failed:`, error.message);
        if (error.message?.includes("decommissioned") || error.message?.includes("not found")) {
          continue; // Try next model
        } else {
          throw error; // Other errors should be thrown
        }
      }
    }

    if (!response) {
      throw new Error(
        `All models failed. Last error: ${lastError?.message || "Unknown error"}\n\n` +
        `Please check available models at https://console.groq.com/docs/models`
      );
    }

    return NextResponse.json({
      response: response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response.",
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    
    // Provide more helpful error messages
    let errorMessage = error.message || "Failed to process chat request";
    
    if (errorMessage.includes("decommissioned")) {
      errorMessage = "The AI model has been updated. Please refresh the page and try again.";
    } else if (errorMessage.includes("model") && errorMessage.includes("not found")) {
      errorMessage = "AI model not available. Please try again in a moment.";
    } else if (errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
      errorMessage = "API rate limit reached. Please try again in a few moments.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

