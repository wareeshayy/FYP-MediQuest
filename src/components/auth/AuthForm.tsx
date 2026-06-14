"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { BookOpen, Mail, Lock, User, Sparkles, Shield, GraduationCap, UserCircle, AlertCircle, RefreshCw, CheckCircle2, X, History, Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

interface AuthFormProps {
  mode: "login" | "signup";
  initialEmail?: string;
}

// Authorized Expert email - only this email can sign up or sign in as Expert
const AUTHORIZED_EXPERT_EMAIL = "f223279@cfd.nu.edu.pk";

// Validation schemas
const signupSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(10, "Name must be maximum 10 characters")
    .refine(
      (val) => /[a-zA-Z]/.test(val),
      "Name must contain at least one letter (alphabets)"
    )
    .refine(
      (val) => !/^\d+$/.test(val),
      "Name cannot contain only digits"
    ),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine(
      (val) => {
        const email = val.trim().toLowerCase();
        // Gmail-style validation: must have @ and domain
        if (!email.includes("@")) return false;
        const [local, domain] = email.split("@");
        if (!local || !domain) return false;
        // Domain must have at least one dot
        if (!domain.includes(".")) return false;
        // Local part cannot be empty
        if (local.length === 0) return false;
        // Domain must have valid TLD
        const domainParts = domain.split(".");
        if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) return false;
        return true;
      },
      "Please enter a valid email address (e.g., name@example.com)"
    ),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["student", "educator", "admin"]), // User can choose their role
});

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .refine(
      (val) => {
        const email = val.trim().toLowerCase();
        // Gmail-style validation: must have @ and domain
        if (!email.includes("@")) return false;
        const [local, domain] = email.split("@");
        if (!local || !domain) return false;
        // Domain must have at least one dot
        if (!domain.includes(".")) return false;
        // Local part cannot be empty
        if (local.length === 0) return false;
        // Domain must have valid TLD
        const domainParts = domain.split(".");
        if (domainParts.length < 2 || domainParts[domainParts.length - 1].length < 2) return false;
        return true;
      },
      "Please enter a valid email address (e.g., name@example.com)"
    ),
  password: z.string().min(1, "Password is required"),
});

type SignupFormData = z.infer<typeof signupSchema>;
type LoginFormData = z.infer<typeof loginSchema>;

interface SavedAccount {
  email: string;
  name?: string;
  role?: string;
  timestamp: number;
}

// Utility functions for managing saved accounts
const SAVED_ACCOUNTS_KEY = "smartprep_saved_accounts";
const MAX_SAVED_ACCOUNTS = 5;

const saveAccount = (email: string, name?: string, role?: string) => {
  if (typeof window === "undefined") return;
  
  try {
    const saved = getSavedAccounts();
    // Remove if already exists
    const filtered = saved.filter(acc => acc.email !== email);
    // Add to beginning
    const newAccount: SavedAccount = {
      email,
      name,
      role,
      timestamp: Date.now(),
    };
    const updated = [newAccount, ...filtered].slice(0, MAX_SAVED_ACCOUNTS);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error saving account:", error);
  }
};

const getSavedAccounts = (): SavedAccount[] => {
  if (typeof window === "undefined") return [];
  
  try {
    const saved = localStorage.getItem(SAVED_ACCOUNTS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Error loading saved accounts:", error);
  }
  return [];
};

const removeSavedAccount = (email: string) => {
  if (typeof window === "undefined") return;
  
  try {
    const saved = getSavedAccounts();
    const filtered = saved.filter(acc => acc.email !== email);
    localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Error removing account:", error);
  }
};

export function AuthForm({ mode, initialEmail }: AuthFormProps) {
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "student",
    },
  });

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Auto-fill email if provided (e.g., from email confirmation)
  useEffect(() => {
    if (mode === "login" && initialEmail) {
      loginForm.setValue("email", initialEmail);
    }
  }, [mode, initialEmail, loginForm]);

  // Reset role to student if email doesn't match authorized Expert email
  useEffect(() => {
    if (mode === "signup") {
      const currentEmail = signupForm.watch("email");
      const currentRole = signupForm.watch("role");
      
      if (currentRole === "educator" && currentEmail) {
        const emailLower = currentEmail.toLowerCase();
        if (emailLower !== AUTHORIZED_EXPERT_EMAIL.toLowerCase()) {
          signupForm.setValue("role", "student");
        }
      }
    }
  }, [signupForm.watch("email"), mode, signupForm]);

  const form = mode === "signup" ? signupForm : loginForm;

  // Load saved accounts on mount (for login mode)
  useEffect(() => {
    if (mode === "login") {
      setSavedAccounts(getSavedAccounts());
    }
  }, [mode]);

  const handleSubmit = async (data: SignupFormData | LoginFormData) => {
    setLoading(true);

    try {
      if (mode === "signup") {
        const signupData = data as SignupFormData;
        
        // Check if user is trying to sign up as Expert
        if (signupData.role === "educator") {
          const emailLower = signupData.email.toLowerCase();
          if (emailLower !== AUTHORIZED_EXPERT_EMAIL.toLowerCase()) {
            toast({
              title: "Access Restricted ❌",
              description: "Only authorized users can sign up as Expert. Please select Student or Admin, or contact support if you need Expert access.",
              variant: "destructive",
              duration: 5000,
            });
            return;
          }
        }
        
        // Ensure we have the correct redirect URL
        const redirectUrl = typeof window !== "undefined" 
          ? `${window.location.origin}/auth/callback?type=signup`
          : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?type=signup`;
        
        console.log("Signing up with email:", signupData.email);
        console.log("Signing up with role:", signupData.role);
        console.log("Redirect URL:", redirectUrl);
        
        // Use the selected role
        const finalRole = signupData.role;
        
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              name: signupData.name,
              full_name: signupData.name,
              role: finalRole,
            },
          },
        });

        console.log("Signup response:", { 
          user: authData?.user ? { 
            id: authData.user.id, 
            email: authData.user.email,
            email_confirmed_at: authData.user.email_confirmed_at,
            confirmed_at: authData.user.confirmed_at 
          } : null,
          error: signUpError,
          session: authData?.session 
        });

        if (signUpError) {
          console.error("Signup error:", signUpError);
          // Check for specific errors
          if (signUpError.message.includes("email") && signUpError.message.includes("already")) {
            throw new Error("An account with this email already exists. Please sign in instead.");
          }
          throw signUpError;
        }

        if (authData.user) {
          setSignupSuccess(true);
          setSignupEmail(signupData.email);
          
          // Save the account for quick access on login page
          saveAccount(signupData.email, signupData.name, signupData.role);
          
          // Check if email confirmation is required
          // If email_confirmed_at is null, email confirmation is required
          const requiresConfirmation = authData.user.email_confirmed_at === null;
          
          if (requiresConfirmation) {
            // Email confirmation is required - email should be sent
            console.log("Email confirmation required - email should be sent");
            toast({
              title: "Account Created Successfully! 🎉",
              description: `We've sent a confirmation email to ${signupData.email}. Please check your inbox (and spam folder) to confirm your account. If you don't see it within a few minutes, click "Resend Confirmation Email" below.`,
              variant: "default",
              duration: 12000,
            });
          } else {
            // Email is already confirmed (might be auto-confirmed if email confirmation is disabled)
            console.log("Email already confirmed or confirmation disabled");
            toast({
              title: "Account Created! 🎉",
              description: `Your account has been created successfully. ${authData.user.email_confirmed_at ? "Your email is already confirmed." : "You can now sign in."}`,
              variant: "default",
              duration: 8000,
            });
          }
          
          // Don't reset form yet - show resend option
        } else {
          console.error("No user returned from signup");
          throw new Error("Failed to create account. Please try again.");
        }
      } else {
        const loginData = data as LoginFormData;
        const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        });

        if (signInError) {
          // Check for specific error types
          const errorMessage = signInError.message.toLowerCase();
          const errorCode = signInError.status || signInError.code;
          
          // Check if email is not confirmed - check multiple possible error formats
          const isEmailNotConfirmed = 
            errorMessage.includes("email not confirmed") ||
            errorMessage.includes("email_not_confirmed") ||
            errorMessage.includes("email not verified") ||
            errorMessage.includes("unconfirmed email") ||
            errorMessage.includes("email confirmation") ||
            errorMessage.includes("verify your email") ||
            (errorCode === 401 && errorMessage.includes("email")) ||
            signInError.name === "EmailNotConfirmedError";
          
          if (isEmailNotConfirmed) {
            setEmailNotConfirmed(true);
            setUnconfirmedEmail(loginData.email);
            throw new Error("Please confirm your email address before signing in. If you've already confirmed, try refreshing the page or wait a few moments for the confirmation to process.");
          } else if (errorMessage.includes("invalid login") || errorMessage.includes("invalid credentials") || errorMessage.includes("wrong password") || errorMessage.includes("invalid password")) {
            setEmailNotConfirmed(false);
            throw new Error("Invalid email or password. Please check your credentials and try again.");
          }
          setEmailNotConfirmed(false);
          throw signInError;
        }
        
        // Double-check email confirmation status even if no error
        if (authData?.user) {
          // If user exists but email is not confirmed, show the error
          // Note: Some Supabase configurations might allow sign-in but still require confirmation
          if (!authData.user.email_confirmed_at) {
            setEmailNotConfirmed(true);
            setUnconfirmedEmail(loginData.email);
            // Sign out the user since email is not confirmed
            await supabase.auth.signOut();
            throw new Error("Please confirm your email address before signing in. If you've already confirmed, the system may need a moment to update. Try refreshing the page.");
          }
          
          // Reset states on successful login
          setEmailNotConfirmed(false);
          setUnconfirmedEmail("");

          const emailLower = loginData.email.toLowerCase();
          
          // Get user role from database (public.users table or metadata)
          let userRole = authData.user.user_metadata?.role || "student";
          
          // Fetch role from public.users table if available
          try {
            const { data: userData, error: userError } = await supabase
              .from("users")
              .select("role")
              .eq("id", authData.user.id)
              .single();
            
            if (!userError && userData?.role) {
              userRole = userData.role;
            }
          } catch (error) {
            console.error("Error fetching user role:", error);
          }

          // Check if user is trying to login as Expert
          if (userRole === "educator") {
            const emailLower = loginData.email.toLowerCase();
            if (emailLower !== AUTHORIZED_EXPERT_EMAIL.toLowerCase()) {
              // Sign out the user immediately
              await supabase.auth.signOut();
              toast({
                title: "Access Denied ❌",
                description: "Only authorized users can sign in as Expert. Please contact support if you need Expert access.",
                variant: "destructive",
                duration: 5000,
              });
              throw new Error("Access denied. This email is not authorized for Expert access.");
            }
          }

          // Role validation - check if role is valid
          console.log("User login verified:", { email: loginData.email, role: userRole });
          
          // Ensure role is valid (student, educator, or admin)
          if (!["student", "educator", "admin"].includes(userRole)) {
            // If role is invalid, default to student
            userRole = "student";
            try {
              await supabase
                .from("users")
                .update({ role: "student" })
                .eq("id", authData.user.id);
            } catch (error) {
              console.error("Error updating user role:", error);
            }
          }

          // Update user metadata with correct role
          if (authData.user.user_metadata?.role !== userRole) {
            await supabase.auth.updateUser({
              data: { role: userRole }
            });
          }

          // Save the account for quick access (update timestamp)
          saveAccount(loginData.email, undefined, userRole);

          // Show user type in success message
          const roleDisplay = userRole === "admin" ? "Admin" : 
                             userRole === "educator" ? "Expert" : "Student";

          // Determine redirect path based on role
          const redirectPath = userRole === "educator" ? "/educator" : "/dashboard";

          toast({
            title: "Signed In Successfully! 👋",
            description: `Welcome back! Signed in as ${roleDisplay}. Redirecting...`,
            variant: "default",
            duration: 3000,
          });

          setTimeout(() => {
            router.push(redirectPath);
          }, 1000);
        }
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "An error occurred. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async (email?: string) => {
    const emailToUse = email || signupEmail;
    if (!emailToUse) return;
    
    setResendLoading(true);
    try {
      const redirectUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/auth/callback?type=signup`
        : `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback?type=signup`;
      
      console.log("Resending confirmation email to:", emailToUse);
      console.log("Redirect URL:", redirectUrl);
      
      const { data, error } = await supabase.auth.resend({
        type: "signup",
        email: emailToUse,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      console.log("Resend response:", { data, error });

      if (error) {
        console.error("Resend error:", error);
        // Check for specific errors
        if (error.message.includes("rate limit") || error.message.includes("too many")) {
          throw new Error("Too many requests. Please wait a few minutes before requesting another email.");
        } else if (error.message.includes("email") && error.message.includes("not found")) {
          throw new Error("Account not found. Please sign up again.");
        }
        throw error;
      }

      toast({
        title: "Confirmation Email Resent! 📧",
        description: `We've sent another confirmation email to ${emailToUse}. Please check your inbox and spam folder. If you still don't see it, check your Supabase email settings.`,
        variant: "default",
        duration: 8000,
      });
    } catch (err: any) {
      console.error("Resend confirmation error:", err);
      toast({
        title: "Error",
        description: err.message || "Failed to resend confirmation email. Please check your Supabase email configuration.",
        variant: "destructive",
        duration: 6000,
      });
    } finally {
      setResendLoading(false);
    }
  };

  const checkEmailConfirmationStatus = async (email: string) => {
    try {
      // Try to get the current session to check user status
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && session.user.email === email) {
        // Refresh the user to get latest confirmation status
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (user && user.email_confirmed_at) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error("Error checking email confirmation:", error);
      return false;
    }
  };



  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      <Card className="backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-2xl">
        <CardHeader className="space-y-3 pb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex items-center justify-center mb-4"
          >
            <div className="p-3 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 rounded-2xl shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
          </motion.div>
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
            {mode === "login" ? "Welcome Back" : "Get Started"}
          </CardTitle>
          <CardDescription className="text-center text-base">
            {mode === "login"
              ? "Sign in to continue your learning journey"
              : "Create your account and start learning smarter"}
          </CardDescription>
        </CardHeader>
        
        {mode === "signup" && signupSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Check Your Email
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                  We've sent a confirmation email to <strong>{signupEmail}</strong>. Please check your inbox and spam folder.
                  <br />
                  <span className="text-blue-600 dark:text-blue-400 mt-1 block text-[10px]">
                    💡 If you don't see the email, check your Supabase Dashboard → Authentication → Settings to enable email confirmations.
                  </span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleResendConfirmation()}
                  disabled={resendLoading}
                  className="w-full text-xs"
                >
                  {resendLoading ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-3 w-3 mr-2" />
                      Resend Confirmation Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
        
        {mode === "login" && emailNotConfirmed && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Email Not Confirmed
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Please confirm your email address before signing in. If you've already confirmed, try refreshing the page or wait a few moments.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      // Clear the error state and try to refresh
                      setEmailNotConfirmed(false);
                      setUnconfirmedEmail("");
                      toast({
                        title: "Status Refreshed",
                        description: "Please try signing in again. If you've confirmed your email, it should work now.",
                        variant: "default",
                      });
                    }}
                    className="flex-1 text-xs border-amber-300 dark:border-amber-700"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Refresh Status
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResendConfirmation(unconfirmedEmail)}
                    disabled={resendLoading}
                    className="flex-1 text-xs border-amber-300 dark:border-amber-700"
                  >
                    {resendLoading ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3 mr-2" />
                        Resend Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
        
        <form 
          onSubmit={form.handleSubmit(handleSubmit)}
          autoComplete="on"
          method="post"
        >
          <CardContent className="space-y-5">
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="name" className="text-sm font-semibold flex items-center gap-2">
                  <User className="h-4 w-4 text-teal-600" />
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  {...signupForm.register("name")}
                  disabled={loading}
                  className={`h-12 border-2 transition-all duration-200 ${
                    signupForm.formState.errors.name
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 focus:border-teal-500"
                  }`}
                />
                {signupForm.formState.errors.name && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {signupForm.formState.errors.name.message}
                  </p>
                )}
                {!signupForm.formState.errors.name && (
                  <p className="text-xs text-muted-foreground">
                    Name must contain letters, not only numbers, and be maximum 10 characters
                  </p>
                )}
              </motion.div>
            )}
            {mode === "signup" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="space-y-2"
              >
                <Label htmlFor="role" className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-teal-600" />
                  Account Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={signupForm.watch("role")}
                  onValueChange={(value: "student" | "educator" | "admin") => {
                    signupForm.setValue("role", value);
                  }}
                >
                  <SelectTrigger className="h-12 border-2 border-gray-300 focus:border-teal-500 transition-all duration-200">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-4 w-4" />
                        <span>Student</span>
                      </div>
                    </SelectItem>
                    <SelectItem 
                      value="educator"
                      disabled={signupForm.watch("email")?.toLowerCase() !== AUTHORIZED_EXPERT_EMAIL.toLowerCase()}
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        <span>Expert</span>
                        {signupForm.watch("email")?.toLowerCase() !== AUTHORIZED_EXPERT_EMAIL.toLowerCase() && (
                          <span className="text-xs text-muted-foreground ml-auto">(Restricted)</span>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        <span>Admin</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {signupForm.watch("role") === "student" && "Access quizzes and track your progress"}
                  {signupForm.watch("role") === "educator" && (
                    signupForm.watch("email")?.toLowerCase() === AUTHORIZED_EXPERT_EMAIL.toLowerCase() 
                      ? "Create classes and manage students"
                      : "Expert role is restricted to authorized users only"
                  )}
                  {signupForm.watch("role") === "admin" && "Full platform access and management"}
                </p>
                {signupForm.watch("role") === "educator" && signupForm.watch("email")?.toLowerCase() !== AUTHORIZED_EXPERT_EMAIL.toLowerCase() && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3" />
                    Only {AUTHORIZED_EXPERT_EMAIL} can sign up as Expert
                  </p>
                )}
              </motion.div>
            )}
            {mode === "login" && savedAccounts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <History className="h-4 w-4 text-teal-600" />
                  Recent Accounts
                </Label>
                <div className="flex flex-wrap gap-2">
                  {savedAccounts.map((account) => {
                    const roleBadge = account.role === "admin" ? "Admin" : 
                                     account.role === "educator" ? "Expert" : "Student";
                    const roleColor = account.role === "admin" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" :
                                    account.role === "educator" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                                    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300";
                    return (
                      <motion.button
                        key={account.email}
                        type="button"
                        onClick={() => {
                          loginForm.setValue("email", account.email);
                          setEmailNotConfirmed(false);
                        }}
                        className="group flex items-center gap-2 px-3 py-2 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-teal-100 dark:hover:bg-teal-900/30 border border-gray-300 dark:border-gray-700 rounded-lg transition-all duration-200"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Mail className="h-3 w-3 text-teal-600" />
                        <span className="text-gray-700 dark:text-gray-300 group-hover:text-teal-700 dark:group-hover:text-teal-400">
                          {account.name ? account.name : account.email.split("@")[0]}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${roleColor}`}>
                          {roleBadge}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSavedAccount(account.email);
                            setSavedAccounts(getSavedAccounts());
                            toast({
                              title: "Account Removed",
                              description: "Account removed from recent accounts.",
                              variant: "default",
                            });
                          }}
                          className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
                        </button>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === "signup" ? 0.4 : savedAccounts.length > 0 ? 0.35 : 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4 text-teal-600" />
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete={mode === "login" ? "email" : "email"}
                placeholder="you@example.com"
                {...(mode === "login" 
                  ? loginForm.register("email", {
                      onChange: () => {
                        setEmailNotConfirmed(false);
                      },
                    })
                  : signupForm.register("email", {
                      onChange: () => {
                        // Handle email change for signup if needed
                      },
                    })
                )}
                disabled={loading}
                className={`h-12 border-2 transition-all duration-200 ${
                  (mode === "login" ? loginForm.formState.errors.email : signupForm.formState.errors.email)
                    ? "border-red-500 focus:border-red-500"
                    : "border-gray-300 focus:border-teal-500"
                }`}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {form.formState.errors.email.message}
                </p>
              )}
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === "signup" ? 0.5 : 0.4 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                <Lock className="h-4 w-4 text-teal-600" />
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  {...(mode === "login" 
                    ? loginForm.register("password")
                    : signupForm.register("password")
                  )}
                  disabled={loading}
                  className={`h-12 border-2 transition-all duration-200 pr-10 ${
                    (mode === "login" ? loginForm.formState.errors.password : signupForm.formState.errors.password)
                      ? "border-red-500 focus:border-red-500"
                      : "border-gray-300 focus:border-teal-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {form.formState.errors.password.message}
                </p>
              )}
              {mode === "signup" && !form.formState.errors.password && (
                <p className="text-xs text-muted-foreground">
                  Password must be at least 6 characters with uppercase, lowercase, and a number
                </p>
              )}
            </motion.div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === "signup" ? 0.6 : 0.5 }}
              className="w-full"
            >
              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-600 hover:via-cyan-600 hover:to-blue-700 text-white font-semibold text-base shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.div>
                    {mode === "login" ? "Signing In..." : "Creating Account..."}
                  </span>
                ) : (
                  mode === "login" ? "Sign In" : "Create Account"
                )}
              </Button>
            </motion.div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: mode === "signup" ? 0.9 : 0.8 }}
              className="text-center text-sm text-muted-foreground pt-2"
            >
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <a
                    href="/auth/signup"
                    className="text-teal-600 dark:text-teal-400 hover:underline font-semibold transition-colors"
                  >
                    Sign up
                  </a>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <a
                    href="/auth/login"
                    className="text-teal-600 dark:text-teal-400 hover:underline font-semibold transition-colors"
                  >
                    Sign in
                  </a>
                </>
              )}
            </motion.p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
