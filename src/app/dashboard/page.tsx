"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useUserRole } from "@/hooks/useUserRole";
import { PlusCircle, TrendingUp, Clock, Target, Play, FileQuestion, Sparkles, BarChart3 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { StudentMessaging } from "@/components/messaging/StudentMessaging";

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
  const router = useRouter();
  const { role, loading: roleLoading } = useUserRole();
  const [stats, setStats] = useState<DashboardStats>({
    totalQuizzes: 0,
    averageAccuracy: 0,
    totalQuestions: 0,
    recentScore: 0,
  });
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizResults, setQuizResults] = useState<Record<string, string>>({}); // quizId -> resultId
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect educators to expert page
  useEffect(() => {
    if (!roleLoading && role === "educator") {
      router.push("/educator");
    }
  }, [role, roleLoading, router]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setLoading(false);
          return;
        }

        // Fetch user's quizzes
        const { data: quizzesData, error: quizzesError } = await supabase
          .from("quizzes")
          .select("id, title, difficulty, total_questions, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (quizzesError) {
          if (quizzesError.code === "PGRST301" || quizzesError.message?.includes("permission")) {
            setError("Permission denied on quizzes table (check RLS)");
          }
        }

        // Fetch user's results - try with total_questions first, fallback without it
        let results: any[] = [];
        const { data: resultsWithTotal, error: err1 } = await supabase
          .from("results")
          .select("id, quiz_id, score, accuracy, total_questions, answers, created_at")
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

        // Map quiz IDs to their latest result IDs
        const resultsMap: Record<string, string> = {};
        results.forEach((r: any) => {
          if (r.quiz_id && !resultsMap[r.quiz_id]) {
            resultsMap[r.quiz_id] = r.id;
          }
        });
        setQuizResults(resultsMap);

        const totalQuizzes = results.length;
        const averageAccuracy = results.length > 0
          ? Math.round(results.reduce((acc: number, r: any) => acc + (r.accuracy || 0), 0) / results.length)
          : 0;
        const totalQuestions = results.reduce((acc: number, r: any) => {
          return acc + (r.total_questions || Object.keys(r.answers || {}).length || 0);
        }, 0);
        const recentScore = results.length > 0 ? results[0].score || 0 : 0;

        setStats({ totalQuizzes, averageAccuracy, totalQuestions, recentScore });
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
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-black bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent mb-3"
              >
                Dashboard
              </motion.h1>
              <p className="text-gray-600 text-lg">
                Welcome back! Here&apos;s your learning overview.
              </p>
            </div>
            <StudentMessaging />
          </div>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600"
            >
              <p className="font-semibold">Error: {error}</p>
            </motion.div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {[
            { title: "Total Quizzes", value: stats.totalQuizzes, icon: Target, color: "from-teal-500 to-cyan-600" },
            { title: "Average Accuracy", value: `${stats.averageAccuracy}%`, icon: TrendingUp, color: "from-cyan-500 to-blue-600" },
            { title: "Questions Answered", value: stats.totalQuestions, icon: PlusCircle, color: "from-blue-500 to-indigo-600" },
            { title: "Recent Score", value: `${stats.recentScore}%`, icon: Clock, color: "from-indigo-500 to-purple-600" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 border-2 border-gray-200 bg-white">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-700">
                    {stat.title}
                  </CardTitle>
                  <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    key={stat.value}
                    initial={{ scale: 1.2 }}
                    animate={{ scale: 1 }}
                    className={`text-3xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}
                  >
                    {loading ? "..." : stat.value}
                  </motion.div>
                  <p className="text-xs text-gray-500 mt-1">
                    {i === 0 && "Quizzes completed"}
                    {i === 1 && "Overall performance"}
                    {i === 2 && "Total practice questions"}
                    {i === 3 && "Last quiz score"}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quick Actions + AI Insights */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-100 hover:shadow-xl transition-all">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  Quick Actions
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Start a new quiz or check your progress
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/create-quiz">
                  <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold h-12 text-base" size="lg">
                    <PlusCircle className="mr-2 h-5 w-5" />
                    Create New Quiz
                  </Button>
                </Link>
                <Link href="/analytics">
                  <Button variant="outline" className="w-full border-2 border-teal-300 text-teal-700 hover:bg-teal-50 font-semibold h-12 text-base" size="lg">
                    View Analytics
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 hover:shadow-xl transition-all">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  AI Insights
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Personalized recommendations for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-gray-600">Loading insights...</p>
                ) : stats.totalQuizzes === 0 ? (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Start by creating your first quiz to get AI-powered insights and recommendations.
                    </p>
                    <Link href="/create-quiz">
                      <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-700 font-medium">
                      {stats.averageAccuracy >= 80
                        ? "🎉 Excellent! You're performing exceptionally well. Keep up the great work!"
                        : stats.averageAccuracy >= 60
                        ? "👍 Good progress! Focus on reviewing wrong answers to improve further."
                        : "💪 Keep practicing! Review explanations to strengthen your understanding."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Your Quizzes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="bg-white border-2 border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-gray-900">Your Quizzes</CardTitle>
              <CardDescription className="text-gray-600">
                {quizzes.length === 0
                  ? "Create your first quiz to get started"
                  : `${quizzes.length} quiz${quizzes.length === 1 ? "" : "zes"} available`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-gray-600 py-8">Loading quizzes...</p>
              ) : quizzes.length === 0 ? (
                <div className="text-center py-12">
                  <FileQuestion className="h-16 w-16 text-gray-300 mx-auto mb-6" />
                  <p className="text-gray-600 mb-6 text-lg">You haven&apos;t created any quizzes yet.</p>
                  <Link href="/create-quiz">
                    <Button className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold px-8 py-6 text-lg">
                      <PlusCircle className="mr-2 h-5 w-5" />
                      Create Your First Quiz
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {quizzes.map((quiz, i) => (
                    <motion.div
                      key={quiz.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                    >
                      <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-100 hover:shadow-lg transition-all">
                        <CardHeader>
                          <CardTitle className="text-xl font-bold text-gray-900">{quiz.title || "Untitled Quiz"}</CardTitle>
                          <CardDescription className="text-gray-600">
                            {quiz.total_questions} question{quiz.total_questions !== 1 ? "s" : ""} • {quiz.difficulty}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          {quizResults[quiz.id] ? (
                            <Link href={`/review/${quizResults[quiz.id]}`}>
                              <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                Review Quiz
                              </Button>
                            </Link>
                          ) : (
                            <Link href={`/play/${quiz.id}`}>
                              <Button className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white">
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
