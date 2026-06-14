"use client";

import { AuthForm } from "@/components/auth/AuthForm";
import { motion } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Sparkling Bokeh Background - Full Screen */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url('https://img.freepik.com/free-vector/bokeh-lights-background_1048-8303.jpg?semt=ais_hybrid&w=740&q=80')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      {/* Subtle Teal Gradient Overlay - Keeps Your Brand Color */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600/40 via-cyan-500/30 to-blue-600/40" />

      {/* Animated Floating Orbs - Magical Touch */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-10 left-10 w-96 h-96 rounded-full bg-gradient-to-br from-teal-400/40 to-cyan-300/30 blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            x: [0, 100, 0],
            y: [0, -60, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-gradient-to-tl from-purple-400/30 to-pink-300/20 blur-3xl"
          animate={{
            scale: [1, 1.5, 1],
            x: [0, -80, 0],
            y: [0, 60, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-screen py-12">
          {/* Left Side - Auth Form with Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="flex items-center justify-center"
          >
            <div className="w-full max-w-md">
              {/* Glass Card */}
              <div className="backdrop-blur-2xl bg-white/20 border border-white/30 rounded-3xl shadow-2xl p-10">
                <div className="text-center mb-8">
                  <h2 className="text-4xl font-bold text-white mb-2">Welcome Back</h2>
                  <p className="text-white/80">Sign in to continue your journey</p>
                </div>
                <AuthForm mode="login" />
              </div>
            </div>
          </motion.div>

          {/* Right Side - Welcome Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="hidden lg:block text-white space-y-8"
          >
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-6xl font-black leading-tight"
              >
                Welcome Back to<br />
                <span className="bg-gradient-to-r from-cyan-300 to-teal-300 bg-clip-text text-transparent">
                  MediQuest
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="text-xl mt-6 text-white/90"
              >
                Your personal AI study coach is ready to help you conquer your exams.
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="space-y-6 pt-8"
            >
              {[
                { text: "AI-powered personalized learning paths", color: "from-cyan-400 to-blue-400" },
                { text: "Instant quiz generation with explanations", color: "from-teal-400 to-emerald-400" },
                { text: "Real-time performance analytics & insights", color: "from-purple-400 to-pink-400" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.2 }}
                  className="flex items-center gap-5 group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="text-lg font-medium text-white/95">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>

      <Toaster />
    </div>
  );
}