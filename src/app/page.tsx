"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Brain, Target, BarChart3, Zap, Users, CheckCircle, Menu, Award, Clock, HeadphonesIcon, BookOpen } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  const features = [
    { title: "Quiz Funnel Builder", desc: "Create smart quiz and survey funnels with branching logic based on user responses.", img: "https://images.unsplash.com/photo-1597933471507-1ca5765185d8?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Nnx8b25saW5lJTIwbGVhcm5pbmd8ZW58MHx8MHx8fDA%3D" },
    { title: "Lead Magnet Quiz", desc: "Collect opt-ins by delivering personalized results — fully customizable forms.", img: "https://www.timeshighereducation.com/sites/default/files/online_learning_0.jpg" },
    { title: "Segmentation", desc: "Automatically tag and segment leads based on quiz outcomes and sync with your email platform.", img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop" },
    { title: "Personalize your Quiz", desc: "Ask for their name first and use it throughout the quiz for a personal touch.", img: "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=600&h=400&fit=crop" },
  ];

  const whyChoose = [
    { icon: Brain, title: "AI-Powered Learning", desc: "Adapts to your unique learning style and pace" },
    { icon: Target, title: "Exam-Focused Practice", desc: "Real exam-style questions with instant feedback" },
    { icon: BarChart3, title: "Detailed Analytics", desc: "Track progress with beautiful performance insights" },
    { icon: Award, title: "Proven Results", desc: "Students score 37% higher on average" },
    { icon: Clock, title: "Save Time", desc: "Learn 3x faster with smart study paths" },
    { icon: HeadphonesIcon, title: "24/7 Support", desc: "Get help anytime from our expert team" },
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 text-white">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2070&auto=format&fit=crop" alt="Students" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-teal-600/80" />
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 320" className="w-full h-24 md:h-40 text-white" preserveAspectRatio="none">
            <path fill="currentColor" d="M0,96L48,112C96,128,192,160,288,170C384,180,480,170,576,160C672,150,768,130,864,120C960,110,1056,110,1152,130C1248,150,1344,190,1392,210L1440,230L1440,320L0,320Z" />
          </svg>
        </div>

        {/* Navigation */}
        <motion.nav initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.7, type: "spring" }} className="relative z-50 container mx-auto px-6 pt-8 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 group">
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

          {/* <div className="hidden lg:flex items-center gap-6 text-white/90 font-medium">
            <Link href="#" className="hover:text-white transition">Home</Link>
            <Link href="#" className="hover:text-white transition">Courses</Link>
            <Link href="#" className="hover:text-white transition">Team</Link>
            <Link href="#" className="hover:text-white transition">FAQ</Link>
            <Link href="#" className="hover:text-white transition">Contact</Link>
            <Link href="/auth/login">
              <Button variant="ghost" className="text-white hover:bg-white/20 border border-white/30 font-semibold rounded-full px-6">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="bg-white text-teal-600 hover:bg-white/90 font-semibold rounded-full px-8">
                Sign Up
              </Button>
            </Link>
          </div> */}
          <button className="lg:hidden"><Menu className="h-8 w-8 text-white" /></button>
        </motion.nav>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-6 pt-32 pb-48 text-center">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9 }} className="text-5xl md:text-7xl lg:text-8xl font-black leading-tight">
Work Smart-Dream Big            
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.3 }} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link href="/auth/signup">
              <Button className="bg-white text-teal-600 hover:bg-white/90 font-bold text-lg px-10 py-7 rounded-full shadow-xl">
                Sign Up Free
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="ghost" className="text-white hover:bg-white/20 font-semibold text-lg px-8 py-7 rounded-full flex items-center gap-3 border border-white/30">
                Sign In <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Smart Prep? */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">Why Choose MediQuest?</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">The most trusted AI-powered learning platform used by over 50,000+ students worldwide</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 max-w-7xl mx-auto">
            {whyChoose.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -8, scale: 1.03 }}
                className="group"
              >
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-3xl p-8 hover:shadow-2xl transition-all duration-500 border border-teal-100">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <item.icon className="h-9 w-9 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                 
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Possibilities Are Endless */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">The Possibilities Are Endless</h2>
            <div className="w-32 h-1 bg-gradient-to-r from-teal-500 to-cyan-500 mx-auto rounded-full" />
          </motion.div>

          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-16 items-center mb-32 last:mb-0`}
            >
              <motion.div whileHover={{ scale: 1.04 }} className="w-full lg:w-1/2">
                <div className="relative group">
                  <div className="absolute -inset-2 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-3xl blur-xl opacity-40 group-hover:opacity-70 transition duration-1000" />
                  <img src={feature.img} alt={feature.title} className="relative rounded-3xl shadow-2xl w-full h-96 object-cover" />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="w-full lg:w-1/2 text-center lg:text-left"
              >
                <h3 className="text-3xl md:text-4xl font-black text-gray-900 mb-6">{feature.title}</h3>
                <p className="text-lg text-gray-600 leading-relaxed max-w-xl">{feature.desc}</p>
                <Button className="mt-8 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-bold px-10 py-6 rounded-full shadow-xl">
                  Explore Feature <ArrowRight className="ml-2" />
                </Button>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <Sparkles className="h-20 w-20 mx-auto mb-8 text-yellow-300 animate-pulse" />
            <h2 className="text-5xl md:text-7xl font-black mb-8">Start Studying Smarter Today</h2>
            <p className="text-xl md:text-2xl mb-12 opacity-90">Join 50,000+ students already transforming their grades with AI</p>
            <div className="flex flex-col sm:flex-row gap-8 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="bg-white/90 text-teal-600 hover:bg-white/90 font-bold text-xl px-16 py-9 rounded-full shadow-2xl transform hover:scale-105 transition">
                  Sign Up Free <Zap className="ml-3 h-7 w-7" />
                </Button>
              </Link>
              <Link href="/auth/login">
              <Button size="lg" className="bg-white/90 text-teal-600 hover:bg-white/90 font-bold text-xl px-16 py-9 rounded-full shadow-2xl transform hover:scale-105 transition">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}