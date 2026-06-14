import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkUserRole } from "@/lib/role-check";

export async function POST(request: NextRequest) {
  try {
    // Check if user has educator or admin role
    const { hasAccess, role, userId } = await checkUserRole(request, ["admin", "educator"]);
    
    if (!hasAccess || !userId) {
      return NextResponse.json({ 
        error: "Unauthorized - Only educators and admins can create classes",
        details: role ? `Your role (${role}) does not have permission` : "Please log in"
      }, { status: 403 });
    }

    const supabase = createServerSupabaseClient(request);

    const body = await request.json();
    const { name, description, organization_id } = body;

    if (!name) {
      return NextResponse.json({ error: "Class name is required" }, { status: 400 });
    }

    // Create class
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .insert({
        name,
        description: description || null,
        organization_id: organization_id || null,
        educator_id: userId,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (classError) {
      console.error("Error creating class:", classError);
      return NextResponse.json(
        { error: classError.message || "Failed to create class" },
        { status: 500 }
      );
    }

    return NextResponse.json({ class: classData }, { status: 201 });
  } catch (error: any) {
    console.error("Error in create class route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

