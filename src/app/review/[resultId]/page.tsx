"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import {
  PlusCircle,
  TrendingUp,
  Clock,
  Target,
  Play,
  FileQuestion,
  BarChart3,
  Brain,
  Activity,
  Award,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface DashboardStats {
  totalQuizzes: number;
  averageAccuracy: number;
  totalQuestions: number;
  recentScore: number;
}

interface Quiz {
  id: string;
  title: string;
  difficulty: string;
  total_questions: number;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    averageAccuracy: 0,
    totalQuestions: 0,
    recentScore: 0,
  });
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setLoading(false);
          return;
        }

        const { data: quizzesData, error: quizzesError } = await supabase
          .from("quizzes")
          .select("id, title, difficulty, total_questions, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (quizzesError) {
          if (
            quizzesError.code === "PGRST301" ||
            quizzesError.message?.includes("permission")
          ) {
            setError("Permission denied on quizzes table (check RLS)");
          }
        }

        let results: any[] = [];
        const { data: resultsWithTotal, error: err1 } = await supabase
          .from("results")
          .select(
            "id, quiz_id, score, accuracy, total_questions, answers, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (err1) {
          const { data: resultsFallback } = await supabase
            .from("results")
            .select("id, quiz_id, score, accuracy, answers, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
          results = resultsFallback || [];
        } else {
          results = resultsWithTotal || [];
        }

        setQuizzes(quizzesData || []);

        const resultsMap: Record<string, string> = {};
        results.forEach((r: any) => {
          if (r.quiz_id && !resultsMap[r.quiz_id]) {
            resultsMap[r.quiz_id] = r.id;
          }
        });
        setQuizResults(resultsMap);

        const totalQuizzes = results.length;
        const averageAccuracy =
          results.length > 0
            ? Math.round(
                results.reduce(
                  (acc: number, r: any) => acc + (r.accuracy || 0),
                  0
                ) / results.length
              )
            : 0;
        const totalQuestions = results.reduce((acc: number, r: any) => {
          return (
            acc +
            (r.total_questions || Object.keys(r.answers || {}).length || 0)
          );
        }, 0);
        const recentScore = results.length > 0 ? results[0].score || 0 : 0;

        setStats({
          totalQuizzes,
          averageAccuracy,
          totalQuestions,
          recentScore,
        });
      } catch (err: any) {
        console.error("fetchStats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <ProtectedRoute>
      <MainLayout>
        {/* Professional Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-10 rounded-lg overflow-hidden bg-gradient-to-r from-[#0B5ED7] to-[#0D6EFD] px-8 py-10 md:px-12 md:py-12"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-5 w-5 text-white" />
              <span className="text-white/90 font-medium text-sm uppercase tracking-wide">
                Medical Learning Platform
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 leading-tight">
              Master Medical Knowledge With AI
            </h1>

            <p className="text-white/90 text-lg mb-6 max-w-2xl">
              The most trusted medical learning platform trusted by healthcare
              professionals and students worldwide
            </p>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white"
              >
                <p className="font-medium">⚠ {error}</p>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-3">
              <Link href="/create-quiz">
                <Button
                  size="lg"
                  className="bg-white text-[#0B5ED7] hover:bg-gray-50 font-semibold px-6 h-11"
                >
                  Create New Quiz
                </Button>
              </Link>
              <Link href="/analytics">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-2 border-white text-white hover:bg-white/10 font-semibold px-6 h-11"
                >
                  View Analytics
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Why Choose Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-10"
        >
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Why Choose MedII Learning?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              The most trusted medical learning platform trusted by healthcare
              professionals and students worldwide
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-10">
            {[
              {
                icon: Brain,
                iconBg: "bg-[#6F42C1]",
                title: "AI-Powered Learning",
                description:
                  "Advanced algorithms generate personalized questions and adapt to your learning pace",
              },
              {
                icon: Target,
                iconBg: "bg-[#D63384]",
                title: "Precision Practice",
                description:
                  "Target weak areas with focused questions and track improvement over time",
              },
              {
                icon: Activity,
                iconBg: "bg-[#0DCAF0]",
                title: "Performance Analytics",
                description:
                  "Comprehensive insights into your progress with detailed performance metrics",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
              >
                <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <div
                      className={`w-14 h-14 ${feature.iconBg} rounded-lg flex items-center justify-center mb-4`}
                    >
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-xl font-semibold text-gray-900">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-10"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-5">
            Your Performance
          </h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Quizzes Completed",
                value: stats.totalQuizzes,
                icon: BookOpen,
                iconBg: "bg-[#0B5ED7]",
              },
              {
                title: "Average Accuracy",
                value: `${stats.averageAccuracy}%`,
                icon: TrendingUp,
                iconBg: "bg-[#198754]",
              },
              {
                title: "Questions Answered",
                value: stats.totalQuestions,
                icon: Award,
                iconBg: "bg-[#6F42C1]",
              },
              {
                title: "Latest Score",
                value: `${stats.recentScore}%`,
                icon: Clock,
                iconBg: "bg-[#FD7E14]",
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.05 }}
              >
                <Card className="bg-white border border-gray-200 hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <div
                      className={`w-10 h-10 ${stat.iconBg} rounded-lg flex items-center justify-center`}
                    >
                      <stat.icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      {loading ? "—" : stat.value}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="mb-10"
        >
          <Card className="bg-gradient-to-r from-[#6F42C1] to-[#9B59B6] border-0 text-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    Performance Insights
                  </CardTitle>
                  <CardDescription className="text-white/80">
                    AI-powered analysis of your learning progress
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <p className="text-white/90">Analyzing performance...</p>
                </div>
              ) : stats.totalQuizzes === 0 ? (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 border border-white/20">
                  <p className="text-white mb-4">
                    Begin your learning journey to unlock personalized insights
                    and recommendations tailored to your performance.
                  </p>
                  <Link href="/create-quiz">
                    <Button
                      size="lg"
                      className="bg-white text-[#6F42C1] hover:bg-gray-50 font-semibold"
                    >
                      Create First Quiz
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-5 border border-white/20">
                  <p className="text-white font-semibold mb-2">
                    {stats.averageAccuracy >= 80
                      ? "Excellent Performance"
                      : stats.averageAccuracy >= 60
                      ? "Strong Progress"
                      : "Building Foundation"}
                  </p>
                  <p className="text-white/90 leading-relaxed">
                    {stats.averageAccuracy >= 80
                      ? "Your performance demonstrates strong mastery of the material. Continue challenging yourself with advanced content to maintain momentum."
                      : stats.averageAccuracy >= 60
                      ? "You're making solid progress. Review incorrect answers and focus on areas where accuracy can be improved for better results."
                      : "Consistent practice is key to improvement. Focus on understanding fundamental concepts and review detailed explanations for each question."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Your Quizzes Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card className="bg-white border border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Your Quizzes
              </CardTitle>
              <CardDescription className="text-gray-600">
                {quizzes.length === 0
                  ? "Create your first quiz to begin"
                  : `${quizzes.length} quiz${
                      quizzes.length === 1 ? "" : "zes"
                    } available`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-3 border-gray-200 border-t-[#0B5ED7] rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600">Loading quizzes...</p>
                </div>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-[#0B5ED7] rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileQuestion className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    No Quizzes Yet
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Start your medical education journey by creating your first
                    quiz
                  </p>
                  <Link href="/create-quiz">
                    <Button
                      size="lg"
                      className="bg-[#0B5ED7] hover:bg-[#0A58CA] text-white font-semibold"
                    >
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Create Your First Quiz
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {quizzes.map((quiz, i) => (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="bg-white border border-gray-200 hover:shadow-lg transition-shadow h-full">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className="w-10 h-10 bg-[#0B5ED7] rounded-lg flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <span
                              className={`px-2.5 py-0.5 rounded text-xs font-medium uppercase ${
                                quiz.difficulty === "easy"
                                  ? "bg-green-100 text-green-700"
                                  : quiz.difficulty === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {quiz.difficulty}
                            </span>
                          </div>
                          <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                            {quiz.title || "Untitled Quiz"}
                          </CardTitle>
                          <CardDescription className="text-gray-600">
                            {quiz.total_questions} question
                            {quiz.total_questions !== 1 ? "s" : ""}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {quizResults[quiz.id] ? (
                            <Link href={`/review/${quizResults[quiz.id]}`}>
                              <Button className="w-full bg-[#6F42C1] hover:bg-[#5A32A3] text-white font-medium">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Review Results
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/play/${quiz.id}`}>
                              <Button className="w-full bg-[#0B5ED7] hover:bg-[#0A58CA] text-white font-medium">
                                <Play className="mr-2 h-4 w-4" />
                                Start Quiz
                              </Button>
                            </Link>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </MainLayout>
    </ProtectedRoute>
  );
}