import type { CourseId } from "./types";

export interface AiOverview {
  configured: boolean;
  dailyLimit: number;
}
export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  correction?: string;
  nextPrompt?: string;
}
export interface TutorConversation {
  courseId: CourseId;
  messages: TutorMessage[];
}
export interface PremiumStats {
  days: { date: string; minutes: number; xp: number }[];
  units: {
    id: string;
    title: string;
    answered: number;
    accuracy: number | null;
  }[];
  completedLessons: number;
}
