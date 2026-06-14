"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings, Bell, Search, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

export function AppNavbar() {
  const { user, signOut } = useAuth();

  const getUserInitials = () => {
    if (user?.email) {
      return user.email
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase();
    }
    return "U";
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="relative z-50 w-full border-b border-teal-200/40 dark:border-teal-800/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 shadow-sm"
    >
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center space-x-3 group">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400/40 via-cyan-400/20 to-blue-400/40 rounded-xl blur-md group-hover:blur-lg transition-all" />
            <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
          </motion.div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-tight bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">MEDI</span>
            <span className="font-bold text-sm leading-tight bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">QUEST</span>
          </div>
        </Link>

        {/* Right Section - Only essential items (no duplicate navigation) */}
        <div className="flex items-center gap-3">
          {/* Search Bar (Desktop) */}
          <div className="hidden xl:flex items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search quizzes, topics..."
                className="w-72 pl-11 h-10 bg-teal-50/50 dark:bg-teal-950/20 border-teal-200/40 dark:border-teal-800/40 text-foreground placeholder:text-muted-foreground rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:border-teal-500 dark:focus:border-teal-400 transition-all"
              />
            </div>
          </div>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-10 w-10 rounded-xl hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all text-foreground"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-destructive rounded-full animate-pulse shadow-lg" />
          </Button>

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-10 w-10 rounded-xl hover:bg-teal-50/50 dark:hover:bg-teal-950/20 transition-all p-0"
                >
                  <Avatar className="h-10 w-10 border-2 border-teal-200 dark:border-teal-800 hover:border-teal-500 dark:hover:border-teal-400 transition-all shadow-md">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 text-white font-semibold">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl border-teal-200/40 dark:border-teal-800/40 shadow-xl p-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl">
                <DropdownMenuLabel className="px-4 py-3">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none text-foreground">
                      {user?.user_metadata?.name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-teal-200/40 dark:bg-teal-800/40" />
                <DropdownMenuItem asChild className="rounded-lg px-4 py-2.5 cursor-pointer">
                  <Link href="/dashboard">
                    <User className="mr-3 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg px-4 py-2.5 cursor-pointer">
                  <Link href="/settings">
                    <Settings className="mr-3 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-teal-200/40 dark:bg-teal-800/40" />
                <DropdownMenuItem
                  onClick={signOut}
                  className="rounded-lg px-4 py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" className="text-foreground hover:bg-teal-50/50 dark:hover:bg-teal-950/20 border border-teal-200/40 dark:border-teal-800/40">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 text-white hover:from-teal-600 hover:via-cyan-600 hover:to-blue-700 font-semibold shadow-lg">
                  Start for Free
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
