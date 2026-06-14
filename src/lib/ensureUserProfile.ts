/**
 * Utility function to ensure user profile exists in public.users table
 * This should be called before any operations that require a user profile
 */
import { supabase } from "./supabase";

export async function ensureUserProfile(userId: string, userEmail?: string, userName?: string) {
  try {
    // Check if user profile exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 means no rows returned, which is expected if user doesn't exist
      console.error("Error checking user profile:", checkError);
      throw checkError;
    }

    // If user profile doesn't exist, create it
    if (!existingUser) {
      // Build user payload - only include fields that exist
      const userPayload: any = {
        id: userId,
        email: userEmail || "",
        name: userName || userEmail?.split("@")[0] || "User",
        role: "student",
      };

      // Only add subscription_plan if column exists (check by trying to select it)
      // We'll handle this gracefully by not including it if it causes an error
      const { error: createError } = await supabase
        .from("users")
        .insert(userPayload);

      if (createError) {
        console.error("Error creating user profile:", createError);
        throw createError;
      }

      return { created: true };
    }

    return { created: false, existing: true };
  } catch (error: any) {
    console.error("Error ensuring user profile:", error);
    throw error;
  }
}

