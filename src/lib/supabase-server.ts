import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/env";

/**
 * Create a Supabase client for API routes that can read the user's session
 * from request headers (Authorization token or cookies)
 */
export function createServerSupabaseClient(request: NextRequest) {
  const { url, anonKey } = getSupabaseConfig();
  const clientUrl = isSupabaseConfigured ? url : "https://placeholder.supabase.co";
  const clientKey = isSupabaseConfigured ? anonKey : "public-anon-key";

  // Get authorization header (Bearer token)
  const authHeader = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie") || "";

  // Create Supabase client
  const client = createClient(clientUrl, clientKey, {
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
