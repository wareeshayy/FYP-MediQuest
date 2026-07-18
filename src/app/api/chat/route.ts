import { NextRequest, NextResponse } from "next/server";
import { runReactAgent } from "@/lib/agents/reactAgent";
import { safetyCriticAgent } from "@/lib/agents/multiAgent";
import { guardMedicalChatInput } from "@/lib/medicalAI";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OUT_OF_SCOPE_MESSAGE } from "@/lib/promptBuilder";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages]
      .reverse()
      .find((msg: { role?: string }) => msg.role === "user");

    if (!lastUserMessage?.content) {
      return NextResponse.json(
        { error: "Last message content is empty" },
        { status: 400 }
      );
    }

    // Layer 1: Fast medical topic query guard
    const blocked = guardMedicalChatInput(String(lastUserMessage.content));
    if (blocked) {
      return NextResponse.json({ 
        response: blocked,
        steps: [{ thought: "Blocked non-medical query", observation: "Rejected out-of-scope input." }]
      });
    }

    // Try to get authenticated user for profile memory context
    let userId: string | undefined = undefined;
    try {
      const supabase = createServerSupabaseClient(request);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        console.log(`👤 Resolved user ID for session memory: ${userId}`);
      }
    } catch (authError) {
      console.warn("Could not get authenticated user from session headers:", authError);
    }

    // Prepare message history formatted for agent loop
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: String(m.content)
    }));

    // Run autonomous ReAct loop
    const agentResult = await runReactAgent(String(lastUserMessage.content), history, userId);

    // Run Safety & Domain Critic Agent on output
    const safeResponse = await safetyCriticAgent(agentResult.response, String(lastUserMessage.content));

    return NextResponse.json({
      response: safeResponse,
      steps: agentResult.steps
    });

  } catch (error: any) {
    console.error("Agent Chat API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process agent chat request" },
      { status: 500 }
    );
  }
}

