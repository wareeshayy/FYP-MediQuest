import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("other_user_id");

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (otherUserId) {
      // Get conversation between current user and other user
      const { data: messages, error: messagesError } = await supabase
        .from("messages")
        .select(`
          *,
          sender:auth.users!messages_sender_id_fkey(id, email),
          receiver:auth.users!messages_receiver_id_fkey(id, email)
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error fetching messages:", messagesError);
        return NextResponse.json(
          { error: messagesError.message || "Failed to fetch messages" },
          { status: 500 }
        );
      }

      // Mark messages as read if they were sent to current user
      if (messages && messages.length > 0) {
        const unreadIds = messages
          .filter((m: any) => m.receiver_id === user.id && !m.is_read)
          .map((m: any) => m.id);

        if (unreadIds.length > 0) {
          await supabase
            .from("messages")
            .update({ is_read: true })
            .in("id", unreadIds);
        }
      }

      return NextResponse.json({ messages: messages || [] });
    } else {
      // Get all conversations (list of users the current user has messaged with)
      const { data: sentMessages, error: sentError } = await supabase
        .from("messages")
        .select("receiver_id, created_at")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false });

      const { data: receivedMessages, error: receivedError } = await supabase
        .from("messages")
        .select("sender_id, created_at, is_read")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      if (sentError || receivedError) {
        console.error("Error fetching conversations:", sentError || receivedError);
        return NextResponse.json(
          { error: "Failed to fetch conversations" },
          { status: 500 }
        );
      }

      // Combine and get unique user IDs
      const allUserIds = new Set<string>();
      const conversations: any[] = [];

      // Process sent messages
      sentMessages?.forEach((msg: any) => {
        if (!allUserIds.has(msg.receiver_id)) {
          allUserIds.add(msg.receiver_id);
          conversations.push({
            user_id: msg.receiver_id,
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
      });

      // Process received messages
      receivedMessages?.forEach((msg: any) => {
        const existing = conversations.find((c) => c.user_id === msg.sender_id);
        if (existing) {
          if (new Date(msg.created_at) > new Date(existing.last_message_at)) {
            existing.last_message_at = msg.created_at;
          }
          if (!msg.is_read) {
            existing.unread_count = (existing.unread_count || 0) + 1;
          }
        } else {
          allUserIds.add(msg.sender_id);
          conversations.push({
            user_id: msg.sender_id,
            last_message_at: msg.created_at,
            unread_count: msg.is_read ? 0 : 1,
          });
        }
      });

      // Get user details for each conversation
      const userIds = Array.from(allUserIds);
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, email, name, full_name, role")
          .in("id", userIds);

        if (!usersError && users) {
          conversations.forEach((conv) => {
            const user = users.find((u: any) => u.id === conv.user_id);
            if (user) {
              conv.user_email = user.email;
              conv.user_name = user.name || user.full_name || user.email;
              conv.user_role = user.role;
            }
          });
        }
      }

      // Sort by last message time
      conversations.sort(
        (a, b) =>
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
      );

      return NextResponse.json({ conversations });
    }
  } catch (error: any) {
    console.error("Error in get messages route:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

