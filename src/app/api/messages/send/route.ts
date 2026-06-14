import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { receiver_id, message } = body;

    if (!receiver_id || !message || !message.trim()) {
      return NextResponse.json(
        { error: "Receiver ID and message are required" },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Insert message
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: user.id,
        receiver_id,
        message: message.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      return NextResponse.json(
        { error: error.message || "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: data, success: true },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in send message route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

