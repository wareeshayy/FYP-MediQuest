"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Loader2, Trophy, TrendingUp, Clock, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";

interface Result {
  id: string;
  score: number;
  total_questions?: number; // Optional in case column doesn't exist
  accuracy: number;
  time_taken: number | null;
  answers: Record<string, string>;
  quiz: {
    id: string;
    title: string;
  };
}

interface Question {
  id: string;
  question_text: string;
  options: string[];
  correct_option: string;
  explanation?: string;
}

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  const resultId = (params?.resultId as string) || "";

  const [result, setResult] = useState<Result | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResult = async () => {
      try {
        // Fetch result with quiz info
        const { data: resultData, error: resultError } = await supabase
          .from("results")
          .select(`
            *,
            quiz:quizzes(id, title)
          `)
          .eq("id", resultId)
          .single();

        if (resultError) throw resultError;
        setResult(resultData as any);

        // Fetch questions for this quiz
        const { data: quizQuestions, error: qqError } = await supabase
          .from("quiz_questions")
          .select("question_id, question_order")
          .eq("quiz_id", resultData.quiz_id)
          .order("question_order", { ascending: true });

        if (qqError) throw qqError;

        if (quizQuestions && quizQuestions.length > 0) {
          const questionIds = quizQuestions.map((qq) => qq.question_id);
          const { data: questionsData, error: questionsError } = await supabase
            .from("questions")
            .select("*")
            .in("id", questionIds);

          if (questionsError) throw questionsError;

          // Sort questions by order
          const sortedQuestions = quizQuestions
            .map((qq) => questionsData?.find((q) => q.id === qq.question_id))
            .filter(Boolean) as Question[];

          setQuestions(sortedQuestions);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    };

    if (resultId) {
      fetchResult();
    }
  }, [resultId]);

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  if (error || !result) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>{error || "Result not found"}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  const percentage = Math.round(result.accuracy);

  return (
    <ProtectedRoute>
      <MainLayout showSidebar={false}>
        <div className="max-w-4xl mx-auto w-full">
          <div className="mb-8 text-center">
            <Trophy className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold mb-2">Quiz Results</h1>
            <p className="text-muted-foreground">{result.quiz.title || "Quiz"}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Score</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {result.score}/{result.total_questions ?? (questions.length || 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{percentage}%</div>
              </CardContent>
            </Card>

            {result.time_taken && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Time Taken</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {Math.floor(result.time_taken / 60)}:
                    {String(result.time_taken % 60).padStart(2, "0")}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
              <CardDescription>
                Review your answers and explanations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question, index) => {
                const userAnswer = result.answers[question.id];
                // Use the same robust comparison logic as the quiz page
                const correctOption = question.correct_option;
                let isCorrect = false;
                
                // Method 1: Direct string comparison
                if (userAnswer === correctOption) {
                  isCorrect = true;
                }
                // Method 2: Trimmed comparison
                else if (userAnswer?.trim() === correctOption?.trim()) {
                  isCorrect = true;
                }
                // Method 3: Index-based (0, 1, 2, 3)
                else if (!isNaN(Number(correctOption)) && Number(correctOption) >= 0 && Number(correctOption) < question.options.length) {
                  const correctIndex = Number(correctOption);
                  if (userAnswer === question.options[correctIndex]) {
                    isCorrect = true;
                  }
                }
                // Method 4: Letter-based (A, B, C, D)
                else if (correctOption && correctOption.length === 1 && /^[A-D]$/i.test(correctOption)) {
                  const letterIndex = correctOption.toUpperCase().charCodeAt(0) - 65;
                  if (letterIndex >= 0 && letterIndex < question.options.length && userAnswer === question.options[letterIndex]) {
                    isCorrect = true;
                  }
                }
                // Method 5: Case-insensitive
                else if (userAnswer?.toLowerCase() === correctOption?.toLowerCase()) {
                  isCorrect = true;
                }
                
                console.log("🔍 Results page - Checking answer:", {
                  questionId: question.id,
                  userAnswer,
                  correctOption,
                  options: question.options,
                  isCorrect,
                });

                return (
                  <div
                    key={question.id}
                    className={`p-4 rounded-lg border-2 ${
                      isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      {isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-1" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-1" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold mb-2">
                          Question {index + 1}: {question.question_text}
                        </p>
                        <div className="space-y-2">
                          {question.options.map((option, optIndex) => {
                            const isUserAnswer = option === userAnswer;
                            // Check if this option is the correct answer using the same logic
                            const correctOption = question.correct_option;
                            let isCorrectAnswer = false;
                            
                            if (option === correctOption) {
                              isCorrectAnswer = true;
                            } else if (option.trim() === correctOption?.trim()) {
                              isCorrectAnswer = true;
                            } else if (!isNaN(Number(correctOption)) && Number(correctOption) >= 0 && Number(correctOption) < question.options.length) {
                              isCorrectAnswer = Number(correctOption) === optIndex;
                            } else if (correctOption && correctOption.length === 1 && /^[A-D]$/i.test(correctOption)) {
                              const letterIndex = correctOption.toUpperCase().charCodeAt(0) - 65;
                              isCorrectAnswer = letterIndex === optIndex;
                            } else if (option.toLowerCase() === correctOption?.toLowerCase()) {
                              isCorrectAnswer = true;
                            }

                            return (
                              <div
                                key={optIndex}
                                className={`p-2 rounded ${
                                  isCorrectAnswer
                                    ? "bg-green-100 border border-green-300"
                                    : isUserAnswer && !isCorrect
                                    ? "bg-red-100 border border-red-300"
                                    : "bg-gray-50"
                                }`}
                              >
                                <span className="font-medium mr-2">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>
                                {option}
                                {isCorrectAnswer && (
                                  <span className="ml-2 text-sm font-semibold text-green-700">
                                    ✓ Correct Answer
                                  </span>
                                )}
                                {isUserAnswer && !isCorrect && (
                                  <span className="ml-2 text-sm font-semibold text-red-700">
                                    ✗ Your Answer
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {question.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-1">
                              Explanation:
                            </p>
                            <p className="text-sm text-blue-800">
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <Link href={`/play/${result.quiz.id}`}>
              <Button>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retake Quiz
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="secondary">View Analytics</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

