import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextRequest } from "next/server";

export type UserRole = "admin" | "educator" | "student";

/**
 * Check if the current user has the required role(s)
 * Returns { hasAccess: boolean, role: UserRole | null, userId: string | null }
 */
export async function checkUserRole(
  request: NextRequest,
  requiredRoles: UserRole[]
): Promise<{
  hasAccess: boolean;
  role: UserRole | null;
  userId: string | null;
}> {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { hasAccess: false, role: null, userId: null };
    }

    // Fetch user role from users table
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { hasAccess: false, role: null, userId: user.id };
    }

    const userRole = profile.role as UserRole;

    // Admins have access to everything
    if (userRole === "admin") {
      return { hasAccess: true, role: userRole, userId: user.id };
    }

    // Check if user role is in required roles
    const hasAccess = requiredRoles.includes(userRole);

    return { hasAccess, role: userRole, userId: user.id };
  } catch (error) {
    console.error("Error checking user role:", error);
    return { hasAccess: false, role: null, userId: null };
  }
}

