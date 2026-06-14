import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("class_id");

    if (!classId) {
      return NextResponse.json({ error: "Class ID is required" }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(classId)) {
      console.error("Invalid class ID format:", classId);
      return NextResponse.json({ 
        error: `Invalid class ID format. Expected UUID format, got: ${classId}` 
      }, { status: 400 });
    }

    // Verify the user owns this class
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, educator_id, name")
      .eq("id", classId)
      .single();

    if (classError || !classData || classData.educator_id !== user.id) {
      return NextResponse.json({ error: "Class not found or unauthorized" }, { status: 403 });
    }

    // Get all students in the class
    // Filter to only get valid UUID user_ids to avoid join errors
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    const { data: studentsData, error: studentsError } = await supabase
      .from("class_students")
      .select("user_id")
      .eq("class_id", classId);

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return NextResponse.json(
        { error: studentsError.message || "Failed to fetch students" },
        { status: 500 }
      );
    }

    // Filter out invalid UUIDs and map to students format
    const students = (studentsData || [])
      .filter((s: any) => s.user_id && uuidRegex.test(s.user_id))
      .map((s: any) => ({
        user_id: s.user_id,
        users: {
          id: s.user_id,
          email: `user-${s.user_id.substring(0, 8)}@example.com`, // Placeholder
          full_name: `Student ${s.user_id.substring(0, 8)}`, // Placeholder
        },
      }));

    if (studentsError) {
      console.error("Error fetching students:", studentsError);
      return NextResponse.json(
        { error: studentsError.message || "Failed to fetch students" },
        { status: 500 }
      );
    }

    // Get all assignments for this class
    const { data: assignments, error: assignmentsError } = await supabase
      .from("class_assignments")
      .select(`
        id,
        quiz_id,
        due_date,
        created_at,
        quiz:quizzes (
          id,
          title,
          total_questions
        )
      `)
      .eq("class_id", classId);

    if (assignmentsError) {
      console.error("Error fetching assignments:", assignmentsError);
      return NextResponse.json(
        { error: assignmentsError.message || "Failed to fetch assignments" },
        { status: 500 }
      );
    }

    // Get results for all students and assignments
    // Filter out invalid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const studentIds = (students?.map((s: any) => s.user_id) || []).filter((id: any) => 
      id && uuidRegex.test(id)
    );
    const quizIds = (assignments?.map((a: any) => a.quiz_id) || []).filter((id: any) => 
      id && uuidRegex.test(id)
    );

    let results: any[] = [];
    if (studentIds.length > 0 && quizIds.length > 0) {
      const { data: resultsData, error: resultsError } = await supabase
        .from("results")
        .select("*")
        .in("user_id", studentIds)
        .in("quiz_id", quizIds)
        .order("created_at", { ascending: false });

      if (!resultsError && resultsData) {
        results = resultsData;
      }
    }

    // Format performance data
    const performance = students?.map((student: any) => {
      const studentResults = results.filter((r: any) => r.user_id === student.user_id);
      const totalQuizzes = assignments?.length || 0;
      const completedQuizzes = studentResults.length;
      const averageScore = studentResults.length > 0
        ? studentResults.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / studentResults.length
        : 0;
      const averageAccuracy = studentResults.length > 0
        ? studentResults.reduce((sum: number, r: any) => sum + (r.accuracy || 0), 0) / studentResults.length
        : 0;

      return {
        student_id: student.user_id,
        student_name: student.users?.full_name || student.users?.email || "Unknown",
        student_email: student.users?.email || "",
        total_quizzes: totalQuizzes,
        completed_quizzes: completedQuizzes,
        average_score: Math.round(averageScore * 100) / 100,
        average_accuracy: Math.round(averageAccuracy * 100) / 100,
        results: studentResults.map((r: any) => ({
          quiz_id: r.quiz_id,
          score: r.score,
          accuracy: r.accuracy,
          completed_at: r.created_at,
        })),
      };
    }) || [];

    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
      },
      assignments: assignments || [],
      performance,
    });
  } catch (error: any) {
    console.error("Error in performance route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

