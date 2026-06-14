"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { Loader2, TrendingUp, Target, Calendar } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface AnalyticsData {
  accuracyOverTime: { date: string; accuracy: number }[];
  topicAccuracy: { topic: string; accuracy: number }[];
  recentResults: {
    date: string;
    score: number;
    total: number;
  }[];
}

// Helper function to process analytics data
function processAnalyticsData(results: any[]): AnalyticsData {
  // Process accuracy over time
  const accuracyData = results.map((r: any) => ({
    date: new Date(r.created_at).toLocaleDateString(),
    accuracy: r.accuracy || 0,
  }));

  // Process topic accuracy
  const topicMap = new Map<string, { correct: number; total: number }>();
  results.forEach((r: any) => {
    const topic = r.topic || (r.quiz?.topic ? { name: r.quiz.topic.name } : null);
    if (topic) {
      const topicName = topic.name || "Unknown";
      const current = topicMap.get(topicName) || { correct: 0, total: 0 };
      const totalQuestions = r.total_questions || Object.keys(r.answers || {}).length || 0;
      topicMap.set(topicName, {
        correct: current.correct + (r.score || 0),
        total: current.total + totalQuestions,
      });
    }
  });

  const topicAccuracy = Array.from(topicMap.entries())
    .filter(([_, stats]) => stats.total > 0)
    .map(([topic, stats]) => ({
      topic,
      accuracy: Math.round((stats.correct / stats.total) * 100),
    }));

  // Recent results
  const recentResults = results.slice(0, 10).map((r: any) => ({
    date: new Date(r.created_at).toLocaleDateString(),
    score: r.score || 0,
    total: r.total_questions || Object.keys(r.answers || {}).length || 0,
  }));

  return {
    accuracyOverTime: accuracyData,
    topicAccuracy,
    recentResults,
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData>({
    accuracyOverTime: [],
    topicAccuracy: [],
    recentResults: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch recent results with quiz and topic information
        // Try with join first, fallback to separate queries if it fails
        let results: any[] = [];
        let resultsError: any = null;
        
        try {
          const { data: joinedResults, error: joinError } = await supabase
            .from("results")
            .select(`
              *,
              quiz:quizzes(id, title, topic_id)
            `)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30);
            
          if (joinError) throw joinError;
          
          // If we got results, fetch topics separately
          if (joinedResults && joinedResults.length > 0) {
            const topicIds = [...new Set(
              joinedResults
                .map((r: any) => r.quiz?.topic_id)
                .filter(Boolean)
            )];
            
            if (topicIds.length > 0) {
              const { data: topicsData } = await supabase
                .from("topics")
                .select("id, name")
                .in("id", topicIds);
                
              // Attach topics to results
              results = joinedResults.map((r: any) => ({
                ...r,
                topic: r.quiz?.topic_id 
                  ? topicsData?.find((t: any) => t.id === r.quiz.topic_id)
                  : null,
              }));
            } else {
              results = joinedResults;
            }
          }
        } catch (error) {
          resultsError = error;
        }

        if (resultsError || results.length === 0) {
          console.error("❌ Error fetching results:", resultsError);
          // Try simpler query without joins
          const { data: simpleResults, error: simpleError } = await supabase
            .from("results")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30);
            
          if (simpleError) {
            console.error("❌ Error fetching results (simple):", simpleError);
            throw simpleError;
          }
          
          // Fetch quiz and topic data separately
          if (simpleResults && simpleResults.length > 0) {
            const quizIds = [...new Set(simpleResults.map((r: any) => r.quiz_id))];
            const { data: quizzesData } = await supabase
              .from("quizzes")
              .select("id, title, topic_id")
              .in("id", quizIds);
              
            const topicIds = [...new Set(quizzesData?.map((q: any) => q.topic_id).filter(Boolean) || [])];
            const { data: topicsData } = await supabase
              .from("topics")
              .select("id, name")
              .in("id", topicIds);
              
            // Combine the data
            const resultsWithData = simpleResults.map((r: any) => {
              const quiz = quizzesData?.find((q: any) => q.id === r.quiz_id);
              const topic = quiz ? topicsData?.find((t: any) => t.id === quiz.topic_id) : null;
              return {
                ...r,
                quiz: quiz || { id: r.quiz_id },
                topic: topic || null,
              };
            });
            
            console.log("📊 Analytics Data:", {
              resultsCount: resultsWithData.length,
              quizzesCount: quizzesData?.length || 0,
              topicsCount: topicsData?.length || 0,
            });
            
            setData(processAnalyticsData(resultsWithData));
            setLoading(false);
            return;
          }
          
          throw resultsError;
        }
        
        console.log("📊 Analytics Data:", {
          resultsCount: results.length || 0,
        });

        if (results.length > 0) {
          setData(processAnalyticsData(results));
        } else {
          console.log("ℹ️ No results found for user");
          setData({
            accuracyOverTime: [],
            topicAccuracy: [],
            recentResults: [],
          });
        }
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const accuracyChartData = {
    labels: data.accuracyOverTime.map((d) => d.date),
    datasets: [
      {
        label: "Accuracy (%)",
        data: data.accuracyOverTime.map((d) => d.accuracy),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const topicChartData = {
    labels: data.topicAccuracy.map((d) => d.topic),
    datasets: [
      {
        data: data.topicAccuracy.map((d) => d.accuracy),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
        ],
      },
    ],
  };

  const recentResultsData = {
    labels: data.recentResults.map((d) => d.date),
    datasets: [
      {
        label: "Score",
        data: data.recentResults.map((d) => d.score),
        backgroundColor: "rgba(16, 185, 129, 0.8)",
      },
      {
        label: "Total Questions",
        data: data.recentResults.map((d) => d.total),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
      },
    ],
  };

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

  return (
    <ProtectedRoute>
      <MainLayout>
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-2">
              Track your progress and performance over time
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Accuracy Over Time</CardTitle>
                <CardDescription>Your accuracy trend across all quizzes</CardDescription>
              </CardHeader>
              <CardContent>
                {data.accuracyOverTime.length > 0 ? (
                  <Line data={accuracyChartData} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No data available yet. Complete some quizzes to see your progress!
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Topic Performance</CardTitle>
                <CardDescription>Accuracy by topic</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topicAccuracy.length > 0 ? (
                  <Doughnut data={topicChartData} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No topic data available
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Quiz Scores</CardTitle>
                <CardDescription>Your latest quiz results</CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentResults.length > 0 ? (
                  <Bar data={recentResultsData} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    No recent results
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
      </MainLayout>
    </ProtectedRoute>
  );
}

