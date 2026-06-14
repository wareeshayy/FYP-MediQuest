import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/env";

const { url, anonKey } = getSupabaseConfig();

// Supabase throws if url is empty; use a placeholder so the app can load without crashing.
const clientUrl = isSupabaseConfigured ? url : "https://placeholder.supabase.co";
const clientKey = isSupabaseConfigured ? anonKey : "public-anon-key";

export const supabase = createClient(clientUrl, clientKey);

export { isSupabaseConfigured };
