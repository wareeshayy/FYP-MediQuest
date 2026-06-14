export interface ExpertProfile {
  id: string;
  name: string;
  title: string;
  qualifications: string[];
  education: string[];
  training: string[];
  hospitals: string[];
  specialties: string[];
  bio: string;
  initials: string;
  accent: "teal" | "cyan";
}

export const EXPERT_PROFILES: ExpertProfile[] = [
  {
    id: "dr-javaria",
    name: "Dr. Javaria",
    title: "USMLE & Medical Exam Mentor",
    qualifications: ["MBBS"],
    education: ["Fatima Jinnah Medical University, Lahore"],
    training: ["House job — Sir Ganga Ram Hospital, Lahore"],
    hospitals: ["Sir Ganga Ram Hospital, Lahore"],
    specialties: ["USMLE Step 1", "Clinical Medicine", "Medical Exam Prep"],
    bio: "Experienced physician guiding students through USMLE preparation with structured study plans and live Zoom mentoring sessions.",
    initials: "DJ",
    accent: "teal",
  },
  {
    id: "dr-aqsa",
    name: "Dr. Aqsa",
    title: "USMLE & Medical Exam Mentor",
    qualifications: ["MBBS"],
    education: ["King Edward Medical University, Lahore"],
    training: ["Clinical training — Mayo Hospital, Lahore"],
    hospitals: ["Mayo Hospital, Lahore"],
    specialties: ["USMLE Step 1", "Pathophysiology", "Medical Exam Prep"],
    bio: "Dedicated medical educator helping students master high-yield concepts and practice USMLE-style reasoning via one-on-one Zoom sessions.",
    initials: "DA",
    accent: "cyan",
  },
];

export function getExpertById(id: string): ExpertProfile | undefined {
  return EXPERT_PROFILES.find((expert) => expert.id === id);
}
