"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BookOpen,
  Menu,
  LogOut,
  User,
  Settings,
  Bell,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";

export function ClassicNavbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40 shadow-lg"
    >
      <div className="container flex h-20 items-center justify-between px-6 lg:px-8">
        {/* Logo Section - More Spacious */}
        <div className="flex items-center gap-12">
          <Link
            href="/dashboard"
            className="flex items-center space-x-3 group transition-all"
          >
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-primary/20 rounded-xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative bg-gradient-to-br from-primary to-primary/70 p-2.5 rounded-xl shadow-lg">
                <Sparkles className="relative h-6 w-6 text-primary-foreground" />
              </div>
            </motion.div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                SmartPrep AI
              </h1>
              <p className="text-xs text-muted-foreground font-medium hidden sm:block">
                AI-Powered Learning Platform
              </p>
            </div>
          </Link>

          {/* Desktop Navigation - More Spacing */}
          <div className="hidden lg:flex items-center gap-2">
            <NavLink href="/dashboard" pathname={pathname}>
              Dashboard
            </NavLink>
            <NavLink href="/create-quiz" pathname={pathname}>
              Create Quiz
            </NavLink>
            <NavLink href="/analytics" pathname={pathname}>
              Analytics
            </NavLink>
            <NavLink href="/educator" pathname={pathname}>
              Expert
            </NavLink>
          </div>
        </div>

        {/* Right Section - More Spacing */}
        <div className="flex items-center gap-3">
          {/* Search Bar (Desktop) */}
          <div className="hidden xl:flex items-center">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search quizzes, topics..."
                className="w-72 pl-11 h-11 bg-accent/30 border-border/40 rounded-xl focus:bg-accent/50 transition-all"
              />
            </div>
          </div>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-11 w-11 rounded-xl hover:bg-accent/50 transition-all"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-gradient-to-r from-red-500 to-red-600 rounded-full animate-pulse shadow-lg" />
          </Button>

          {/* Theme Toggle */}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-11 w-11 rounded-xl hover:bg-accent/50 transition-all p-0"
              >
                <Avatar className="h-11 w-11 border-2 border-primary/20 hover:border-primary/40 transition-all shadow-md">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl border-border/40 shadow-xl p-2">
              <DropdownMenuLabel className="px-4 py-3">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">
                    {user?.user_metadata?.name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border/40" />
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
              <DropdownMenuSeparator className="bg-border/40" />
              <DropdownMenuItem
                onClick={signOut}
                className="rounded-lg px-4 py-2.5 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] border-border/40">
              <div className="flex flex-col space-y-3 mt-8">
                <NavLink
                  href="/dashboard"
                  pathname={pathname}
                  mobile
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </NavLink>
                <NavLink
                  href="/create-quiz"
                  pathname={pathname}
                  mobile
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Quiz
                </NavLink>
                <NavLink
                  href="/analytics"
                  pathname={pathname}
                  mobile
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Analytics
                </NavLink>
                <NavLink
                  href="/educator"
                  pathname={pathname}
                  mobile
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Expert
                </NavLink>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.nav>
  );
}

interface NavLinkProps {
  href: string;
  pathname: string;
  children: React.ReactNode;
  mobile?: boolean;
  onClick?: () => void;
}

function NavLink({ href, pathname, children, mobile, onClick }: NavLinkProps) {
  const isActive = pathname === href || pathname?.startsWith(href + "/");

  if (mobile) {
    return (
      <Link href={href} onClick={onClick}>
        <motion.div
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "px-5 py-3.5 rounded-xl text-sm font-medium transition-all",
            isActive
              ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/20 shadow-md"
              : "hover:bg-accent/50"
          )}
        >
          {children}
        </motion.div>
      </Link>
    );
  }

  return (
    <Link href={href}>
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "px-5 py-2.5 rounded-xl text-sm font-medium transition-all relative",
          isActive
            ? "bg-gradient-to-r from-primary/20 to-primary/10 text-primary shadow-md"
            : "hover:bg-accent/50"
        )}
      >
        {children}
        {isActive && (
          <motion.div
            layoutId="activeTab"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-primary to-primary/60 rounded-full"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
      </motion.div>
    </Link>
  );
}
