"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600">
          <div className="text-center space-y-4 text-white">
            <Loader2 className="h-8 w-8 animate-spin mx-auto" />
            <p className="text-lg">Verifying your email...</p>
          </div>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (!searchParams) {
        router.push("/auth/login");
        return;
      }

      const code = searchParams.get("code");
      const type = searchParams.get("type"); // Check if this is from email confirmation
      
      if (code) {
        // Check if this is an email confirmation BEFORE exchanging the code
        const isEmailConfirmation = type === "signup";
        
        // If this is an email confirmation, sign out any existing session FIRST
        // This prevents conflicts with existing logged-in accounts
        if (isEmailConfirmation) {
          await supabase.auth.signOut();
          // Clear storage before processing
          if (typeof window !== "undefined") {
            const supabaseKeys = Object.keys(localStorage).filter(key => 
              key.startsWith("sb-") || key.includes("supabase") || key.includes("auth")
            );
            supabaseKeys.forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
          }
        }
        
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        
        if (error) {
          console.error("Auth callback error:", error);
          setStatus("error");
          setMessage("Failed to verify your email. Please try again or contact support.");
          toast({
            title: "Verification Failed",
            description: error.message || "An error occurred during email verification.",
            variant: "destructive",
          });
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push("/auth/login?error=verification_failed");
          }, 3000);
        } else {
          // Check if this is an email confirmation
          if (isEmailConfirmation || data.user?.email_confirmed_at) {
            // Email confirmed - IMMEDIATELY sign out BEFORE doing anything else
            // This prevents automatic sign-in on the confirmed account
            
            // First, clear all storage immediately
            if (typeof window !== "undefined") {
              // Clear Supabase session storage FIRST
              const supabaseKeys = Object.keys(localStorage).filter(key => 
                key.startsWith("sb-") || key.includes("supabase") || key.includes("auth")
              );
              supabaseKeys.forEach(key => {
                try {
                  localStorage.removeItem(key);
                } catch (e) {
                  console.error("Error removing key:", key, e);
                }
              });
              
              // Clear session storage
              try {
                sessionStorage.clear();
              } catch (e) {
                console.error("Error clearing sessionStorage:", e);
              }
              
              // Clear all cookies
              try {
                document.cookie.split(";").forEach(c => {
                  const cookieName = c.split("=")[0].trim();
                  document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/;domain=${window.location.hostname}`;
                  document.cookie = `${cookieName}=;expires=${new Date(0).toUTCString()};path=/`;
                });
              } catch (e) {
                console.error("Error clearing cookies:", e);
              }
            }
            
            // Now sign out from Supabase (this should be quick since we cleared storage)
            const { error: signOutError } = await supabase.auth.signOut();
            
            if (signOutError) {
              console.error("Sign out error:", signOutError);
            }
            
            // Double-check: Clear storage again after sign out
            if (typeof window !== "undefined") {
              const supabaseKeys = Object.keys(localStorage).filter(key => 
                key.startsWith("sb-") || key.includes("supabase") || key.includes("auth")
              );
              supabaseKeys.forEach(key => localStorage.removeItem(key));
              sessionStorage.clear();
            }
            
            // Set status and show success dialog
            setStatus("success");
            setMessage("Email confirmed successfully! You can now sign in.");
            setConfirmedEmail(data.user?.email || "");
            setShowSuccessDialog(true);
            
            // Show toast
            toast({
              title: "Email Confirmed! ✅",
              description: "Your email has been verified. Redirecting to sign in...",
              variant: "default",
              duration: 3000,
            });
            
            // Automatically redirect to sign-in page after 2 seconds
            setTimeout(() => {
              if (typeof window !== "undefined") {
                // Store email in sessionStorage for auto-fill
                sessionStorage.setItem("confirmed_email", data.user?.email || "");
                window.location.href = `/auth/login?verified=true&email=${encodeURIComponent(data.user?.email || "")}`;
              } else {
                router.replace(`/auth/login?verified=true&email=${encodeURIComponent(data.user?.email || "")}`);
              }
            }, 2000);
          } else {
            // Regular OAuth callback - keep them signed in
            router.push("/dashboard");
          }
        }
      } else {
        // No code parameter, redirect to login
        router.push("/auth/login");
      }
    };

    handleAuthCallback();
  }, [searchParams, router, toast]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600">
        <div className="text-center space-y-4 text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-lg">Verifying your email...</p>
        </div>
      </div>
    );
  }

  const handleGoToSignIn = () => {
    setShowSuccessDialog(false);
    // Use window.location for clean redirect with email parameter
    if (typeof window !== "undefined") {
      window.location.href = `/auth/login?verified=true&email=${encodeURIComponent(confirmedEmail)}`;
    } else {
      router.replace(`/auth/login?verified=true&email=${encodeURIComponent(confirmedEmail)}`);
    }
  };

  if (status === "success") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600">
          <div className="text-center space-y-4 text-white max-w-md px-4">
            <CheckCircle className="h-16 w-16 mx-auto text-green-300" />
            <h2 className="text-2xl font-bold">Email Confirmed!</h2>
            <p className="text-lg">{message}</p>
          </div>
        </div>
        
        {/* Success Dialog Popup */}
        <Dialog open={showSuccessDialog} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full"
                >
                  <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
                </motion.div>
              </div>
              <DialogTitle className="text-2xl font-bold text-center">
                Email Confirmed Successfully! ✅
              </DialogTitle>
              <DialogDescription className="text-center text-base pt-2">
                Your email address <strong className="text-gray-900 dark:text-gray-100">{confirmedEmail}</strong> has been verified.
                <br />
                <span className="text-teal-600 dark:text-teal-400 font-semibold mt-2 block">
                  You can now sign in to your account.
                </span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-center pt-4">
              <Button
                onClick={handleGoToSignIn}
                className="w-full sm:w-auto bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-700 text-white font-semibold"
                size="lg"
              >
                Go to Sign In
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600">
      <div className="text-center space-y-4 text-white max-w-md px-4">
        <XCircle className="h-16 w-16 mx-auto text-red-300" />
        <h2 className="text-2xl font-bold">Verification Failed</h2>
        <p className="text-lg">{message}</p>
        <Button
          onClick={() => router.push("/auth/login")}
          className="mt-4 bg-white text-teal-600 hover:bg-gray-100"
        >
          Go to Sign In
        </Button>
      </div>
    </div>
  );
}

