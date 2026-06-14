"use client";

import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RoleProtectedRoute } from "@/components/auth/RoleProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import {
  GraduationCap,
  Users,
  BookOpen,
  BarChart3,
  Plus,
  Mail,
  FileDown,
  Loader2,
  X,
  CheckCircle2,
  TrendingUp,
  Clock,
  Video,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { ExpertMessaging } from "@/components/messaging/EducatorMessaging";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Class {
  id: string;
  name: string;
  description?: string;
  organization_id?: string;
  educator_id: string;
  created_at: string;
  zoom_meeting?: {
    join_url: string;
    start_time?: string;
    password?: string;
  };
}

interface Quiz {
  id: string;
  title: string;
  total_questions?: number;
}

interface StudentPerformance {
  student_id: string;
  student_name: string;
  student_email: string;
  total_quizzes: number;
  completed_quizzes: number;
  average_score: number;
  average_accuracy: number;
  results: Array<{
    quiz_id: string;
    score: number;
    accuracy: number;
    completed_at: string;
  }>;
}

interface Assignment {
  id: string;
  quiz_id: string;
  due_date?: string;
  created_at: string;
  quiz: {
    id: string;
    title: string;
    total_questions?: number;
  };
}

export default function EducatorPage() {
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [performance, setPerformance] = useState<StudentPerformance[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingClass, setCreatingClass] = useState(false);
  const [invitingStudents, setInvitingStudents] = useState(false);
  const [assigningQuiz, setAssigningQuiz] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [creatingZoomMeeting, setCreatingZoomMeeting] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Form states
  const [className, setClassName] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [studentEmails, setStudentEmails] = useState<string[]>([""]);
  const [selectedQuiz, setSelectedQuiz] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [createZoomWithInvite, setCreateZoomWithInvite] = useState(false);
  const [zoomMeetingTopic, setZoomMeetingTopic] = useState("");
  const [zoomMeetingStartTime, setZoomMeetingStartTime] = useState("");
  const [zoomMeetingDuration, setZoomMeetingDuration] = useState("60");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchPerformance();
    }
  }, [selectedClass]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch classes
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("*")
        .eq("educator_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch Zoom meetings separately
      let zoomMeetingsMap: Record<string, any> = {};
      if (classesData && classesData.length > 0) {
        const classIds = classesData.map((c: any) => c.id);
        const { data: zoomMeetingsData, error: zoomError } = await supabase
          .from("class_zoom_meetings")
          .select("class_id, join_url, start_time, password")
          .in("class_id", classIds);

        if (!zoomError && zoomMeetingsData) {
          zoomMeetingsData.forEach((zm: any) => {
            zoomMeetingsMap[zm.class_id] = {
              join_url: zm.join_url,
              start_time: zm.start_time,
              password: zm.password,
            };
          });
        }
      }

      if (classesError) {
        console.error("Error fetching classes:", classesError);
        setClasses([]);
      } else {
        // Map zoom_meetings data to classes
        const classesWithZoom = (classesData || []).map((cls: any) => {
          const zoomMeeting = zoomMeetingsMap[cls.id] || null;
          return {
            ...cls,
            zoom_meeting: zoomMeeting,
          };
        });
        console.log("Classes with Zoom meetings:", classesWithZoom);
        setClasses(classesWithZoom);
      }

      // Fetch quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from("quizzes")
        .select("id, title, total_questions")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (quizzesError) {
        console.error("Error fetching quizzes:", quizzesError);
      } else {
        setQuizzes(quizzesData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    if (!selectedClass) return;

    // Validate that selectedClass is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(selectedClass)) {
      toast({
        title: "Error",
        description: "Invalid class ID. Please select a valid class.",
        variant: "destructive",
      });
      setSelectedClass("");
      return;
    }

    setLoadingPerformance(true);
    try {
      // Get access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch(`/api/classes/performance?class_id=${selectedClass}`, {
        headers: {
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch performance");
      }

      setPerformance(data.performance || []);
      setAssignments(data.assignments || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch performance data",
        variant: "destructive",
      });
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      toast({
        title: "Error",
        description: "Class name is required",
        variant: "destructive",
      });
      return;
    }

    setCreatingClass(true);
    try {
      // Get access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch("/api/classes/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          name: className,
          description: classDescription || null,
          organization_id: organizationId || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create class");
      }

      toast({
        title: "Success",
        description: "Class created successfully",
      });

      // Reset form
      setClassName("");
      setClassDescription("");
      setOrganizationId("");

      // Refresh classes
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create class",
        variant: "destructive",
      });
    } finally {
      setCreatingClass(false);
    }
  };

  const handleInviteStudents = async (classId: string) => {
    const validEmails = studentEmails.filter((email) => email.trim() && email.includes("@"));
    
    if (validEmails.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one valid email address",
        variant: "destructive",
      });
      return;
    }

    if (createZoomWithInvite && !zoomMeetingTopic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting topic",
        variant: "destructive",
      });
      return;
    }

    setInvitingStudents(true);
    try {
      // Get access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch("/api/classes/invite-with-zoom", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          class_id: classId,
          emails: validEmails,
          meeting_topic: createZoomWithInvite ? zoomMeetingTopic : null,
          meeting_start_time: createZoomWithInvite && zoomMeetingStartTime ? zoomMeetingStartTime : null,
          meeting_duration: createZoomWithInvite ? parseInt(zoomMeetingDuration) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to invite students");
      }

      toast({
        title: "Success",
        description: `Invitations sent to ${validEmails.length} student(s)${data.zoom_meeting ? " with Zoom meeting link" : ""}`,
      });

      // Reset form
      setStudentEmails([""]);
      setCreateZoomWithInvite(false);
      setZoomMeetingTopic("");
      setZoomMeetingStartTime("");
      setZoomMeetingDuration("60");

      // Refresh classes to get updated Zoom meeting info
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to invite students",
        variant: "destructive",
      });
    } finally {
      setInvitingStudents(false);
    }
  };

  const copyZoomLink = async (link: string, classId: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLinkId(classId);
      toast({
        title: "Copied!",
        description: "Zoom meeting link copied to clipboard",
      });
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  const handleCreateZoomMeeting = async (classId: string, className: string) => {
    if (!zoomMeetingTopic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a meeting topic",
        variant: "destructive",
      });
      return;
    }

    setCreatingZoomMeeting(true);
    try {
      // Get access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch("/api/zoom/create-meeting", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          topic: zoomMeetingTopic || `Class Meeting: ${className}`,
          start_time: zoomMeetingStartTime || null,
          duration: parseInt(zoomMeetingDuration) || 60,
          class_id: classId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create Zoom meeting");
      }

      toast({
        title: "Success",
        description: "Zoom meeting created successfully",
      });

      // Reset form
      setZoomMeetingTopic("");
      setZoomMeetingStartTime("");
      setZoomMeetingDuration("60");

      // Refresh classes to get updated Zoom meeting info
      await fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create Zoom meeting",
        variant: "destructive",
      });
    } finally {
      setCreatingZoomMeeting(false);
    }
  };

  const handleAssignQuiz = async (classId: string) => {
    if (!selectedQuiz) {
      toast({
        title: "Error",
        description: "Please select a quiz",
        variant: "destructive",
      });
      return;
    }

    setAssigningQuiz(true);
    try {
      // Get access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch("/api/classes/assign-quiz", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        credentials: "include",
        body: JSON.stringify({
          class_id: classId,
          quiz_id: selectedQuiz,
          due_date: dueDate || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign quiz");
      }

      toast({
        title: "Success",
        description: "Quiz assigned successfully",
      });

      // Reset form
      setSelectedQuiz("");
      setDueDate("");

      // Refresh performance
      if (selectedClass === classId) {
        await fetchPerformance();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign quiz",
        variant: "destructive",
      });
    } finally {
      setAssigningQuiz(false);
    }
  };

  const handleExportPDF = () => {
    if (!selectedClass || performance.length === 0) {
      toast({
        title: "Error",
        description: "Please select a class with performance data",
        variant: "destructive",
      });
      return;
    }

    const selectedClassData = classes.find((c) => c.id === selectedClass);
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text("Class Performance Report", 14, 20);
    doc.setFontSize(12);
    doc.text(`Class: ${selectedClassData?.name || "Unknown"}`, 14, 30);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 36);

    // Summary statistics
    const totalStudents = performance.length;
    const totalCompleted = performance.reduce((sum, p) => sum + p.completed_quizzes, 0);
    const avgAccuracy = performance.length > 0
      ? performance.reduce((sum, p) => sum + p.average_accuracy, 0) / performance.length
      : 0;

    doc.setFontSize(14);
    doc.text("Summary", 14, 50);
    doc.setFontSize(10);
    doc.text(`Total Students: ${totalStudents}`, 14, 58);
    doc.text(`Total Completed Quizzes: ${totalCompleted}`, 14, 64);
    doc.text(`Average Accuracy: ${avgAccuracy.toFixed(2)}%`, 14, 70);

    // Performance table
    const tableData = performance.map((p) => [
      p.student_name,
      p.student_email,
      `${p.completed_quizzes}/${p.total_quizzes}`,
      `${p.average_score.toFixed(1)}`,
      `${p.average_accuracy.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      startY: 80,
      head: [["Student Name", "Email", "Completed", "Avg Score", "Avg Accuracy"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [20, 91, 60] }, // teal color
    });

    // Individual student details
    let yPos = (doc as any).lastAutoTable.finalY + 20;
    performance.forEach((student, index) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.text(`${student.student_name} - Details`, 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      if (student.results.length > 0) {
        const resultData = student.results.map((r) => {
          const assignment = assignments.find((a) => a.quiz_id === r.quiz_id);
          return [
            assignment?.quiz.title || "Unknown Quiz",
            r.score.toString(),
            `${r.accuracy.toFixed(1)}%`,
            new Date(r.completed_at).toLocaleDateString(),
          ];
        });

        autoTable(doc, {
          startY: yPos,
          head: [["Quiz", "Score", "Accuracy", "Completed"]],
          body: resultData,
          theme: "striped",
          margin: { left: 14 },
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.text("No completed quizzes", 14, yPos);
        yPos += 10;
      }
    });

    doc.save(`class-performance-${selectedClassData?.name || "report"}-${Date.now()}.pdf`);
    toast({
      title: "Success",
      description: "PDF report generated successfully",
    });
  };

  const addEmailField = () => {
    setStudentEmails([...studentEmails, ""]);
  };

  const removeEmailField = (index: number) => {
    setStudentEmails(studentEmails.filter((_, i) => i !== index));
  };

  const updateEmail = (index: number, value: string) => {
    const newEmails = [...studentEmails];
    newEmails[index] = value;
    setStudentEmails(newEmails);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <MainLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </div>
        </MainLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <RoleProtectedRoute allowedRoles={["admin", "educator"]} redirectTo="/dashboard">
        <MainLayout>
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <GraduationCap className="h-8 w-8 text-teal-600" />
                  Expert Portal
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage classes and create Zoom meetings
                </p>
              </div>
              <ExpertMessaging />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Classes
                </CardTitle>
                <CardDescription>Total classes created</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{classes.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-600" />
                  Zoom Meetings
                </CardTitle>
                <CardDescription>Active meetings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {classes.filter(c => c.zoom_meeting).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create Class Dialog */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Class</CardTitle>
              <CardDescription>
                Create a new class and link it to an organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="className">Class Name *</Label>
                  <Input
                    id="className"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g., Math 101 - Fall 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="classDescription">Description</Label>
                  <Input
                    id="classDescription"
                    value={classDescription}
                    onChange={(e) => setClassDescription(e.target.value)}
                    placeholder="Optional class description"
                  />
                </div>
                <div>
                  <Label htmlFor="organizationId">Organization ID</Label>
                  <Input
                    id="organizationId"
                    value={organizationId}
                    onChange={(e) => setOrganizationId(e.target.value)}
                    placeholder="Optional organization ID"
                  />
                </div>
                <Button
                  onClick={handleCreateClass}
                  disabled={creatingClass}
                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600"
                >
                  {creatingClass ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Class
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Classes List */}
          {classes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Classes</CardTitle>
                <CardDescription>Manage your classes and students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {classes.map((classItem) => (
                    <div
                      key={classItem.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{classItem.name}</h3>
                          {classItem.description && (
                            <p className="text-sm text-muted-foreground">
                              {classItem.description}
                            </p>
                          )}
                          {classItem.organization_id && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Org ID: {classItem.organization_id}
                            </p>
                          )}
                          {classItem.zoom_meeting ? (
                            <div className="mt-2 flex items-center gap-2">
                              <Video className="h-4 w-4 text-blue-600" />
                              <a
                                href={classItem.zoom_meeting.join_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                              >
                                Join Zoom Meeting
                                <ExternalLink className="h-3 w-3" />
                              </a>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => copyZoomLink(classItem.zoom_meeting!.join_url, classItem.id)}
                                title="Copy meeting link"
                              >
                                {copiedLinkId === classItem.id ? (
                                  <Check className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          ) : (
                            <div className="mt-2 text-xs text-muted-foreground">
                              No Zoom meeting created yet
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {!classItem.zoom_meeting && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Video className="mr-2 h-4 w-4" />
                                  Create Zoom Meeting
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Create Zoom Meeting</DialogTitle>
                                  <DialogDescription>
                                    Create a Zoom meeting for this class
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="zoomMeetingTopic">Meeting Topic *</Label>
                                    <Input
                                      id="zoomMeetingTopic"
                                      value={zoomMeetingTopic}
                                      onChange={(e) => setZoomMeetingTopic(e.target.value)}
                                      placeholder={`e.g., ${classItem.name} - Class Meeting`}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="zoomMeetingStartTime">Start Time (Optional)</Label>
                                    <Input
                                      id="zoomMeetingStartTime"
                                      type="datetime-local"
                                      value={zoomMeetingStartTime}
                                      onChange={(e) => setZoomMeetingStartTime(e.target.value)}
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="zoomMeetingDuration">Duration (minutes)</Label>
                                    <Input
                                      id="zoomMeetingDuration"
                                      type="number"
                                      value={zoomMeetingDuration}
                                      onChange={(e) => setZoomMeetingDuration(e.target.value)}
                                      min="15"
                                      max="240"
                                      placeholder="60"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleCreateZoomMeeting(classItem.id, classItem.name)}
                                    disabled={creatingZoomMeeting || !zoomMeetingTopic.trim()}
                                    className="w-full bg-gradient-to-r from-teal-500 to-cyan-600"
                                  >
                                    {creatingZoomMeeting ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating...
                                      </>
                                    ) : (
                                      <>
                                        <Video className="mr-2 h-4 w-4" />
                                        Create Meeting
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Mail className="mr-2 h-4 w-4" />
                                Invite Students
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Invite Students</DialogTitle>
                                <DialogDescription>
                                  Enter email addresses to invite students to this class
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                {studentEmails.map((email, index) => (
                                  <div key={index} className="flex gap-2">
                                    <Input
                                      type="email"
                                      value={email}
                                      onChange={(e) => updateEmail(index, e.target.value)}
                                      placeholder="student@example.com"
                                    />
                                    {studentEmails.length > 1 && (
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => removeEmailField(index)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  onClick={addEmailField}
                                  className="w-full"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  Add Another Email
                                </Button>
                                
                                {/* Zoom Meeting Options */}
                                <div className="border-t pt-4 space-y-4">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`zoom-checkbox-${classItem.id}`}
                                      checked={createZoomWithInvite}
                                      onChange={(e) => setCreateZoomWithInvite(e.target.checked)}
                                      className="rounded"
                                    />
                                    <Label htmlFor={`zoom-checkbox-${classItem.id}`} className="flex items-center gap-2 cursor-pointer">
                                      <Video className="h-4 w-4" />
                                      Create Zoom Meeting
                                    </Label>
                                  </div>
                                  
                                  {createZoomWithInvite && (
                                    <div className="space-y-3 pl-6 border-l-2">
                                      <div>
                                        <Label htmlFor="zoomTopic">Meeting Topic *</Label>
                                        <Input
                                          id="zoomTopic"
                                          value={zoomMeetingTopic}
                                          onChange={(e) => setZoomMeetingTopic(e.target.value)}
                                          placeholder={`e.g., ${classItem.name} - Class Meeting`}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="zoomStartTime">Start Time (Optional)</Label>
                                        <Input
                                          id="zoomStartTime"
                                          type="datetime-local"
                                          value={zoomMeetingStartTime}
                                          onChange={(e) => setZoomMeetingStartTime(e.target.value)}
                                        />
                                      </div>
                                      <div>
                                        <Label htmlFor="zoomDuration">Duration (minutes)</Label>
                                        <Input
                                          id="zoomDuration"
                                          type="number"
                                          value={zoomMeetingDuration}
                                          onChange={(e) => setZoomMeetingDuration(e.target.value)}
                                          min="15"
                                          max="240"
                                          placeholder="60"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <Button
                                  onClick={() => handleInviteStudents(classItem.id)}
                                  disabled={invitingStudents}
                                  className="w-full bg-gradient-to-r from-teal-500 to-cyan-600"
                                >
                                  {invitingStudents ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="mr-2 h-4 w-4" />
                                      Send Invitations{createZoomWithInvite ? " with Zoom Link" : ""}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


          {classes.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No classes yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first class to get started
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </MainLayout>
      </RoleProtectedRoute>
    </ProtectedRoute>
  );
}
