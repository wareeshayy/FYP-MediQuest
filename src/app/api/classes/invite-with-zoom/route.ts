import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { zoomService } from "@/lib/zoom";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { class_id, emails, meeting_topic, meeting_start_time, meeting_duration } = body;

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
      .select("id, educator_id, name")
      .eq("id", class_id)
      .single();

    if (classError || !classData || classData.educator_id !== user.id) {
      return NextResponse.json({ error: "Class not found or unauthorized" }, { status: 403 });
    }

    let zoomMeeting = null;
    let zoomJoinUrl = null;

    // Create Zoom meeting if meeting_topic is provided
    if (meeting_topic) {
      try {
        const meeting = await zoomService.createMeeting({
          topic: meeting_topic || `Class Meeting: ${classData.name}`,
          start_time: meeting_start_time,
          duration: meeting_duration || 60,
          settings: {
            join_before_host: true,
            waiting_room: false,
            email_notification: true,
            participant_video: true,
            registrants_confirmation_email: true,
            registrants_email_notification: true,
          }
        });

        zoomMeeting = meeting;
        zoomJoinUrl = meeting.join_url;

        // Store meeting info
        await supabase
          .from("class_zoom_meetings")
          .upsert({
            class_id,
            zoom_meeting_id: meeting.id,
            join_url: meeting.join_url,
            start_url: meeting.start_url,
            password: meeting.password,
            start_time: meeting.start_time,
            duration: meeting.duration,
            created_by: user.id,
            created_at: new Date().toISOString(),
          }, {
            onConflict: 'class_id'
          });
      } catch (zoomError: any) {
        console.error("Error creating Zoom meeting:", zoomError);
        // Continue with invitations even if Zoom meeting creation fails
      }
    }

    // Create invitations for each email
    const invitations = emails.map((email: string) => ({
      class_id,
      email: email.trim().toLowerCase(),
      invited_by: user.id,
      status: "pending",
      zoom_meeting_id: zoomMeeting?.id || null,
      zoom_join_url: zoomJoinUrl,
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

    // TODO: Send actual email invitations here with Zoom link
    // You can integrate with SendGrid, Resend, or any email service
    // Example email content:
    // Subject: Invitation to join [Class Name]
    // Body: You've been invited to join [Class Name]. 
    //      Join Zoom meeting: [zoomJoinUrl]
    //      Meeting Password: [password] (if applicable)

    return NextResponse.json(
      { 
        message: `Invitations sent to ${invitations.length} student(s)`,
        invitations: inviteData,
        zoom_meeting: zoomMeeting ? {
          join_url: zoomMeeting.join_url,
          start_time: zoomMeeting.start_time,
          password: zoomMeeting.password,
        } : null
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error in invite with Zoom route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

