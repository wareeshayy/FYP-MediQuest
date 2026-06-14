"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileQuestion,
  BarChart3,
  GraduationCap,
  Settings,
  HelpCircle,
  LogOut,
  Library,
  Stethoscope,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";

interface SidebarProps {
  className?: string;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create-quiz", label: "Create Quiz", icon: FileQuestion, badge: "New" },
  { href: "/reading-material", label: "Reading Material", icon: Library },
  { href: "/experts", label: "Expert Profiles", icon: Stethoscope },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/educator", label: "Expert", icon: GraduationCap },
];

const settingsItems = [
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
];

export function Sidebar({ className }: SidebarProps) {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const pathname = usePathname();

  const getUserInitials = () => {
    if (user?.email) {
      return user.email
        .split("@")[0]
        .slice(0, 2)
        .toUpperCase();
    }
    return "U";
  };

  // Filter navigation items based on user role
  const getFilteredNavItems = () => {
    if (role === "educator") {
      // Experts: Remove Dashboard, Create Quiz, and Reading Material
      return navItems.filter(item => 
        item.href !== "/dashboard" && 
        item.href !== "/create-quiz" &&
        item.href !== "/reading-material"
      );
    } else if (role === "student") {
      // Students: no expert portal or expert profiles
      return navItems.filter(
        (item) => item.href !== "/educator" && item.href !== "/experts"
      );
    }
    // Admin: Show all items
    return navItems;
  };

  const filteredNavItems = getFilteredNavItems();

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "w-full h-full border-r border-gray-200 bg-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative overflow-hidden",
        className
      )}
    >
      {/* Background Image */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url('https://img.freepik.com/free-vector/bokeh-lights-background_1048-8303.jpg?semt=ais_hybrid&w=740&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600/30 via-cyan-500/20 to-blue-600/30 dark:from-slate-900/80 dark:via-slate-800/80 dark:to-slate-900/80" />
      
      <div className="flex h-full flex-col relative z-10">
        {/* Logo Section - More Spacious */}
        <div className="flex h-20 items-center justify-center border-b border-border/40 px-6 backdrop-blur-sm bg-white/10 dark:bg-slate-900/10">
          <Link
            href={role === "educator" ? "/educator" : "/dashboard"}
            className="flex items-center space-x-3 group transition-all"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: -5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400/40 via-cyan-400/20 to-blue-400/40 rounded-xl blur-md group-hover:blur-lg transition-all" />
              <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-lg shadow-teal-500/20">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
            </motion.div>
            <div className="hidden sm:block">
              <div className="text-lg font-bold tracking-tight bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                MediQuest
              </div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Learning Platform
              </div>
            </div>
          </Link>
        </div>

        {/* Navigation Items - More Spacing */}
        <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
          <div className="space-y-2">
            {filteredNavItems.map((item, index) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                pathname?.startsWith(item.href + "/");

              return (
                <motion.div
                  key={item.href}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.08, duration: 0.3 }}
                >
                  <Link href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "group relative flex items-center gap-4 px-5 py-4 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer backdrop-blur-sm",
                        isActive
                          ? "bg-white/30 dark:bg-slate-900/30 text-teal-700 dark:text-teal-300 shadow-lg shadow-teal-100/50 dark:shadow-teal-900/50 border border-teal-200/50 dark:border-teal-800/50"
                          : "text-gray-700 dark:text-gray-300 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-white/20 dark:hover:bg-slate-900/20"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-teal-500 via-cyan-500 to-blue-600 rounded-r-full"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon
                        className={cn(
                          "h-5 w-5 transition-all duration-300",
                          isActive
                            ? "text-teal-600 dark:text-teal-400 scale-110"
                            : "group-hover:scale-110 group-hover:text-teal-600 dark:group-hover:text-teal-400"
                        )}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && (
                        <span className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-full shadow-md">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          <Separator className="my-6 bg-border/40" />

          {/* Settings Section */}
          <div className="space-y-2">
            {settingsItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <motion.div
                  key={item.href}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.08, duration: 0.3 }}
                >
                  <Link href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-4 px-5 py-3.5 rounded-xl text-sm font-medium transition-all duration-300 backdrop-blur-sm",
                        isActive
                          ? "bg-white/30 dark:bg-slate-900/30 text-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-slate-900/20"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </nav>

        {/* User Section - More Spacious */}
        <div className="border-t border-border/40 p-6 space-y-4 bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm">
          <div className="flex items-center gap-4 px-4 py-4 rounded-2xl bg-white/30 dark:bg-slate-900/30 border border-teal-200/50 dark:border-teal-800/50 hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300 group backdrop-blur-sm">
            <Avatar className="h-10 w-10 border-2 border-teal-300 dark:border-teal-700 group-hover:border-teal-500 dark:group-hover:border-teal-400 transition-colors shadow-lg">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 text-white font-semibold text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-foreground">
                {user?.user_metadata?.name || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-4 px-5 py-3.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all duration-300 backdrop-blur-sm bg-white/10 dark:bg-slate-900/10"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            <span className="font-medium">Sign Out</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
