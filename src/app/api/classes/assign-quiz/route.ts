import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { class_id, quiz_id, due_date } = body;

    if (!class_id || !quiz_id) {
      return NextResponse.json(
        { error: "Class ID and Quiz ID are required" },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(class_id)) {
      return NextResponse.json({ 
        error: "Invalid class ID format. Expected UUID format." 
      }, { status: 400 });
    }
    if (!uuidRegex.test(quiz_id)) {
      return NextResponse.json({ 
        error: "Invalid quiz ID format. Expected UUID format." 
      }, { status: 400 });
    }

    // Verify the user owns this class
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, educator_id")
      .eq("id", class_id)
      .single();

    if (classError || !classData || classData.educator_id !== user.id) {
      return NextResponse.json({ error: "Class not found or unauthorized" }, { status: 403 });
    }

    // Verify the user owns this quiz
    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("id, user_id")
      .eq("id", quiz_id)
      .single();

    if (quizError || !quizData || quizData.user_id !== user.id) {
      return NextResponse.json({ error: "Quiz not found or unauthorized" }, { status: 403 });
    }

    // Create assignment
    const { data: assignmentData, error: assignmentError } = await supabase
      .from("class_assignments")
      .insert({
        class_id,
        quiz_id,
        assigned_by: user.id,
        due_date: due_date || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (assignmentError) {
      console.error("Error creating assignment:", assignmentError);
      return NextResponse.json(
        { error: assignmentError.message || "Failed to assign quiz" },
        { status: 500 }
      );
    }

    return NextResponse.json({ assignment: assignmentData }, { status: 201 });
  } catch (error: any) {
    console.error("Error in assign quiz route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

