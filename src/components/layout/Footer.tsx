"use client";

import Link from "next/link";
import { BookOpen, Github, Twitter, Linkedin, Mail, Heart, ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
      { label: "Use Cases", href: "/use-cases" },
      { label: "FAQ", href: "/faq" },
    ],
    resources: [
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
      { label: "Tutorials", href: "/tutorials" },
      { label: "Support", href: "/support" },
    ],
    company: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
    { icon: Github, href: "https://github.com", label: "GitHub" },
    { icon: Linkedin, href: "https://linkedin.com", label: "LinkedIn" },
    { icon: Mail, href: "mailto:support@mediquest.ai", label: "Email" },
  ];

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="relative border-t border-teal-200/40 dark:border-teal-800/40 mt-auto w-full overflow-hidden">
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
      
      {/* Decorative Top Border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-300 dark:via-teal-700 to-transparent z-10" />
      
      <div className="container mx-auto px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 space-y-6"
          >
            <Link href="/dashboard" className="flex items-center space-x-3 group">
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                className="relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400/40 via-cyan-400/20 to-blue-400/40 rounded-xl blur-md group-hover:blur-lg transition-all" />
                <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 p-3 rounded-xl shadow-lg shadow-teal-500/20">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
              </motion.div>
              <div>
                <h3 className="text-xl font-bold tracking-tight bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  MediQuest
                </h3>
                <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase mt-0.5">
                  AI-Powered Learning Platform
                </p>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
              Transform your learning experience with AI-generated personalized
              quizzes and comprehensive analytics. Study smarter, not harder.
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <motion.a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="p-2.5 rounded-lg bg-white/30 dark:bg-slate-900/30 hover:bg-white/50 dark:hover:bg-slate-900/50 border border-teal-200/50 dark:border-teal-800/50 hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300 group backdrop-blur-sm"
                    aria-label={social.label}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" />
                  </motion.a>
                );
              })}
            </div>
          </motion.div>

          {/* Product Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <h4 className="font-semibold text-sm tracking-wide uppercase text-foreground mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-300 inline-block hover:translate-x-1 group"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 group-hover:w-full transition-all duration-300" />
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Resources Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4"
          >
            <h4 className="font-semibold text-sm tracking-wide uppercase text-foreground mb-4">
              Resources
            </h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-300 inline-block hover:translate-x-1 group"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 group-hover:w-full transition-all duration-300" />
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Company Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="space-y-4"
          >
            <h4 className="font-semibold text-sm tracking-wide uppercase text-foreground mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link, index) => (
                <motion.li
                  key={link.href}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-300 inline-block hover:translate-x-1 group"
                  >
                    <span className="relative">
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 group-hover:w-full transition-all duration-300" />
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="border-t border-teal-200/40 dark:border-teal-800/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {currentYear} MediQuest. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-white/30 dark:bg-slate-900/30 hover:bg-white/50 dark:hover:bg-slate-900/50 border border-teal-200/50 dark:border-teal-800/50 hover:border-teal-300 dark:hover:border-teal-700 transition-all duration-300 backdrop-blur-sm"
              aria-label="Scroll to top"
            >
              <ArrowUp className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
