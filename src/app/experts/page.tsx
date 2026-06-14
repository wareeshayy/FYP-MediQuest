"use client";

import { useState } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EXPERT_PROFILES, type ExpertProfile } from "@/lib/expert-profiles";
import { useToast } from "@/hooks/use-toast";
import {
  Stethoscope,
  GraduationCap,
  Building2,
  Video,
  Loader2,
  Copy,
  ExternalLink,
  Award,
} from "lucide-react";
import { motion } from "framer-motion";

interface ZoomMeetingResult {
  join_url: string;
  start_url: string;
  password?: string;
  start_time?: string;
  duration?: number;
  topic?: string;
}

function ExpertCard({
  expert,
  onScheduleZoom,
}: {
  expert: ExpertProfile;
  onScheduleZoom: (expert: ExpertProfile) => void;
}) {
  const gradient =
    expert.accent === "teal"
      ? "from-teal-500 via-teal-600 to-cyan-600"
      : "from-cyan-500 via-blue-500 to-blue-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="h-full border-2 border-gray-100 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
        <div className={`h-2 bg-gradient-to-r ${gradient}`} />
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16 border-2 border-white shadow-md">
              <AvatarFallback
                className={`bg-gradient-to-br ${gradient} text-white text-lg font-bold`}
              >
                {expert.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-2xl text-gray-900">{expert.name}</CardTitle>
              <CardDescription className="text-base mt-1">{expert.title}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">{expert.bio}</p>

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <GraduationCap className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Education
                </p>
                {expert.education.map((item) => (
                  <p key={item} className="text-sm text-gray-800">
                    {expert.qualifications.join(", ")} — {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Training & Hospital
                </p>
                {expert.training.map((item) => (
                  <p key={item} className="text-sm text-gray-800">
                    {item}
                  </p>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Award className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Specialties
                </p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {expert.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="px-2.5 py-1 text-xs font-medium rounded-full bg-teal-50 text-teal-700 border border-teal-100"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={() => onScheduleZoom(expert)}
            className={`w-full bg-gradient-to-r ${gradient} text-white hover:opacity-90`}
          >
            <Video className="h-4 w-4 mr-2" />
            Schedule Zoom Session
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function ExpertsPage() {
  const { toast } = useToast();
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("60");
  const [loading, setLoading] = useState(false);
  const [meetingResult, setMeetingResult] = useState<ZoomMeetingResult | null>(null);

  const openScheduleDialog = (expert: ExpertProfile) => {
    setSelectedExpert(expert);
    setTopic("");
    setStartTime("");
    setDuration("60");
    setMeetingResult(null);
    setDialogOpen(true);
  };

  const handleSchedule = async () => {
    if (!selectedExpert || !topic.trim()) {
      toast({
        title: "Missing details",
        description: "Please enter a session topic.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/experts/schedule-zoom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expertId: selectedExpert.id,
          topic: topic.trim(),
          start_time: startTime || null,
          duration: parseInt(duration, 10),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to schedule session");
      }

      setMeetingResult(data.meeting);
      toast({
        title: "Zoom session created",
        description: `Your session with ${selectedExpert.name} is ready.`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to schedule session";
      toast({
        title: "Could not schedule session",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copied", description: "Zoom join link copied to clipboard." });
  };

  return (
    <RoleProtectedRoute allowedRoles={["admin", "educator"]} redirectTo="/dashboard">
      <MainLayout>
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 shadow-lg">
                <Stethoscope className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Expert Profiles
                </h1>
                <p className="text-gray-600 dark:text-gray-300">
                  Connect with our USMLE mentors and schedule live Zoom study sessions.
                </p>
              </div>
            </div>

            <Card className="border-teal-100 bg-gradient-to-r from-teal-50 via-cyan-50 to-blue-50">
              <CardContent className="pt-6 flex items-start gap-3">
                <Video className="h-5 w-5 text-teal-600 mt-0.5 shrink-0" />
                <p className="text-sm text-gray-700">
                  Each expert can arrange a Zoom meeting with students for USMLE guidance,
                  topic review, and exam strategy sessions.
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            {EXPERT_PROFILES.map((expert, index) => (
              <motion.div
                key={expert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <ExpertCard expert={expert} onScheduleZoom={openScheduleDialog} />
              </motion.div>
            ))}
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Schedule Zoom with {selectedExpert?.name ?? "Expert"}
              </DialogTitle>
              <DialogDescription>
                Create a live USMLE mentoring session. Share the join link with your study group.
              </DialogDescription>
            </DialogHeader>

            {meetingResult ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 space-y-2">
                  <p className="text-sm font-medium text-teal-900">Session ready</p>
                  {meetingResult.start_time && (
                    <p className="text-xs text-teal-800">
                      Start: {new Date(meetingResult.start_time).toLocaleString()}
                    </p>
                  )}
                  {meetingResult.password && (
                    <p className="text-xs text-teal-800">Password: {meetingResult.password}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button asChild className="w-full">
                    <a href={meetingResult.join_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Join Zoom Meeting
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => copyLink(meetingResult.join_url)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Join Link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTopic">Session Topic *</Label>
                  <Input
                    id="sessionTopic"
                    placeholder="e.g., Cardiology review, Biochemistry high-yield topics"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startTime">Preferred Date & Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration} disabled={loading}>
                    <SelectTrigger id="duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                      <SelectItem value="90">90 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleSchedule}
                  disabled={loading || !topic.trim()}
                  className="w-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating meeting...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Create Zoom Meeting
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </MainLayout>
    </RoleProtectedRoute>
  );
}
