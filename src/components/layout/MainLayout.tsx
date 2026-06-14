"use client";

import { Sidebar } from "./Sidebar";
import { AppNavbar } from "./AppNavbar";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showFooter?: boolean;
}

export function MainLayout({
  children,
  showSidebar = true,
  showFooter = true,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navbar - positioned above sidebar */}
      <div className="sticky top-0 z-50">
        <AppNavbar />
      </div>
      
      <div className="flex flex-1 relative">
        {/* Sidebar - fixed on left, positioned below navbar */}
        {showSidebar && (
          <>
            <aside className="hidden lg:block fixed left-0 top-[73px] h-[calc(100vh-73px)] w-72 border-r border-border/40 bg-background backdrop-blur-xl z-30 overflow-y-auto">
              <Sidebar className="h-full" />
            </aside>
            {/* Spacer for sidebar */}
            <div className="hidden lg:block w-72 flex-shrink-0" />
          </>
        )}
        
        {/* Main content - with proper margin for sidebar */}
        <main
          className={cn(
            "flex-1 w-full min-w-0 transition-all duration-300 flex flex-col",
            showSidebar ? "" : ""
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="container mx-auto px-4 py-6 lg:py-8 flex-1"
          >
            {children}
          </motion.div>
          
          {/* Footer - inside main content area, below children */}
          {showFooter && (
            <div className="w-full mt-auto">
              <Footer />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
