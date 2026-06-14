import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { zoomService } from "@/lib/zoom";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient(request);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { topic, start_time, duration, class_id, password } = body;

    if (!topic) {
      return NextResponse.json({ error: "Meeting topic is required" }, { status: 400 });
    }

    // Create Zoom meeting
    const meeting = await zoomService.createMeeting({
      topic,
      start_time,
      duration: duration || 60,
      password,
      settings: {
        join_before_host: true,
        waiting_room: false,
        email_notification: true,
        participant_video: true,
        registrants_confirmation_email: true,
        registrants_email_notification: true,
      }
    });

    // If class_id is provided, store the meeting link in the database
    if (class_id) {
      // Verify the user owns this class
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("id, educator_id")
        .eq("id", class_id)
        .single();

      if (classError || !classData || classData.educator_id !== user.id) {
        // Still return the meeting, but don't store it
        return NextResponse.json({ 
          meeting,
          warning: "Class not found or unauthorized. Meeting created but not linked."
        }, { status: 201 });
      }

      // Store meeting info in class_zoom_meetings table (create if doesn't exist)
      const { error: meetingError } = await supabase
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

      if (meetingError) {
        console.error("Error storing meeting in database:", meetingError);
        // Still return the meeting even if database storage fails
      }
    }

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error: any) {
    console.error("Error in create Zoom meeting route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create Zoom meeting" },
      { status: 500 }
    );
  }
}

