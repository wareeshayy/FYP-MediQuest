import { NextRequest, NextResponse } from "next/server";
import { getExpertById } from "@/lib/expert-profiles";
import { zoomService } from "@/lib/zoom";
import { formatQuizError } from "@/lib/formatQuizError";
import { checkUserRole } from "@/lib/role-check";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { hasAccess } = await checkUserRole(request, ["admin", "educator"]);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Expert profiles are only available to educators." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { expertId, topic, start_time, duration = 60 } = body;

    if (!expertId || !topic?.trim()) {
      return NextResponse.json(
        { error: "Expert and meeting topic are required." },
        { status: 400 }
      );
    }

    const expert = getExpertById(expertId);
    if (!expert) {
      return NextResponse.json({ error: "Expert not found." }, { status: 404 });
    }

    const meetingTopic = `USMLE Session with ${expert.name}: ${topic.trim()}`;

    const meeting = await zoomService.createMeeting({
      topic: meetingTopic,
      start_time: start_time || undefined,
      duration: Number(duration) || 60,
      settings: {
        join_before_host: true,
        waiting_room: false,
        email_notification: true,
        participant_video: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        expert: expert.name,
        meeting: {
          join_url: meeting.join_url,
          start_url: meeting.start_url,
          password: meeting.password,
          start_time: meeting.start_time,
          duration: meeting.duration,
          topic: meeting.topic,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error scheduling expert Zoom session:", error);
    const rawMessage = error instanceof Error ? error.message : "Failed to schedule Zoom session";
    return NextResponse.json({ error: formatQuizError(rawMessage) }, { status: 500 });
  }
}
