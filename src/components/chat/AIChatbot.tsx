"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User, Sparkles, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChatbotProps {
  topicId?: string;
  quizId?: string;
  sourceContent?: string;
  topicName?: string;
}

export function AIChatbot({ topicId, quizId, sourceContent, topicName }: AIChatbotProps) {
  // Determine initial message based on context
  const getInitialMessage = () => {
    if (!topicId && !quizId) {
      // On create quiz page
      return `Hello! I'm your MediQuest USMLE/PLAB assistant. I can help you:
• Brainstorm medical exam topics
• Improve medical study notes
• Explain USMLE/PLAB concepts
• Suggest clinical MCQ ideas

${topicName ? `You're working on: **${topicName}**\n` : ''}${sourceContent ? `I can see your medical study content. Ask me to help refine it or suggest USMLE-style questions!` : 'What medical topic would you like help with?'}`;
    } else {
      // On review page
      return `Hello! I'm your MediQuest USMLE/PLAB tutor. I can help explain ${topicName || "this medical topic"}, clarify exam concepts, or discuss MCQ reasoning. What would you like to know?`;
    }
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: getInitialMessage(),
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Debug: Log when component renders
  useEffect(() => {
    console.log("🤖 AIChatbot component rendered", { 
      topicId, 
      quizId, 
      topicName,
      hasSourceContent: !!sourceContent,
      isOpen 
    });
  }, [topicId, quizId, topicName, sourceContent, isOpen]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Call our API route instead of using client-side API key
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            { role: "user", content: userMessage.content },
          ],
          context: (() => {
            if (!topicId && !quizId) {
              // On create quiz page - provide quiz creation context
              let ctx = "The user is creating a quiz. ";
              if (topicName) {
                ctx += `Topic: ${topicName}. `;
              }
              if (sourceContent) {
                ctx += `Content provided: ${sourceContent.substring(0, 1500)}... `;
              }
              ctx += "Help them with quiz creation, content improvement, topic suggestions, or generating quiz ideas.";
              return ctx;
            } else {
              // On review page - provide learning context
              return sourceContent ? `Topic: ${topicName || "Unknown"}\n\nSource Content:\n${sourceContent.substring(0, 2000)}` : undefined;
            }
          })(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get AI response");
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "I apologize, but I couldn't generate a response.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I apologize, but I encountered an error: ${error.message || "Unable to process your request"}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Always render the chatbot button - make it more visible
  return (
    <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none">
      {/* Floating Chat Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.15, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            console.log("🤖 Chatbot button clicked!");
            setIsOpen(true);
          }}
          className="w-20 h-20 bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-teal-500/50 transition-all group cursor-pointer pointer-events-auto"
          aria-label="Open AI Chatbot"
          style={{ boxShadow: "0 10px 40px rgba(20, 184, 166, 0.4)" }}
        >
          <Bot className="h-10 w-10 group-hover:scale-110 transition-transform" />
          <motion.div
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-white/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="w-96 h-[600px] flex flex-col pointer-events-auto"
          >
            <Card className="flex flex-col h-full bg-white border-2 border-teal-200 shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">AI Learning Assistant</h3>
                    <p className="text-xs text-white/80">Ask me anything!</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50 to-white">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                          message.role === "user"
                            ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white"
                            : "bg-white border border-gray-200 text-gray-800 shadow-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.role === "user" && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
                {loading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question..."
                    className="flex-1 border-2 border-gray-300 focus:border-teal-500 rounded-full"
                    disabled={loading}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-full px-6"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Press Enter to send • Ask about the topic or request new questions
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

