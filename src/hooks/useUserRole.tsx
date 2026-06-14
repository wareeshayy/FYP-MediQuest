"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export type UserRole = "admin" | "educator" | "student" | null;

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } else {
          setRole((data?.role as UserRole) || "student");
        }
      } catch (error) {
        console.error("Error in useUserRole:", error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdmin = role === "admin";
  const isEducator = role === "educator" || role === "admin";
  const isStudent = role === "student" || role === null;

  return {
    role,
    isAdmin,
    isEducator,
    isStudent,
    loading: authLoading || loading,
  };
}

