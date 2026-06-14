import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

/**
 * Create a Supabase client for API routes that can read the user's session
 * from request headers (Authorization token or cookies)
 */
export function createServerSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Get authorization header (Bearer token)
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie") || "";

  // Create Supabase client
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        ...(authHeader && { Authorization: authHeader }),
        ...(cookieHeader && { Cookie: cookieHeader }),
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return client;
}

