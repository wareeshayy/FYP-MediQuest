import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { checkUserRole } from "@/lib/role-check";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Check if user has educator or admin role
    const { hasAccess, userId } = await checkUserRole(request, ["admin", "educator"]);
    
    if (!hasAccess || !userId) {
      return NextResponse.json({ 
        error: "Unauthorized - Only educators and admins can invite students"
      }, { status: 403 });
    }

    const supabase = createServerSupabaseClient(request);

    const body = await request.json();
    const { class_id, emails } = body;

    if (!class_id || !emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: "Class ID and at least one email is required" },
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

    // Verify the user owns this class
    const { data: classData, error: classError } = await supabase
      .from("classes")
      .select("id, educator_id")
      .eq("id", class_id)
      .single();

    if (classError || !classData || classData.educator_id !== userId) {
      return NextResponse.json({ error: "Class not found or unauthorized" }, { status: 403 });
    }

    // Create invitations for each email
    const invitations = emails.map((email: string) => ({
      class_id,
      email: email.trim().toLowerCase(),
      invited_by: userId,
      status: "pending",
      created_at: new Date().toISOString(),
    }));

    const { data: inviteData, error: inviteError } = await supabase
      .from("class_invitations")
      .insert(invitations)
      .select();

    if (inviteError) {
      console.error("Error creating invitations:", inviteError);
      return NextResponse.json(
        { error: inviteError.message || "Failed to create invitations" },
        { status: 500 }
      );
    }

    // TODO: Send actual email invitations here
    // For now, we'll just return the invitations

    return NextResponse.json(
      { 
        message: `Invitations sent to ${invitations.length} student(s)`,
        invitations: inviteData 
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in invite students route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

