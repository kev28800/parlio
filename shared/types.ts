import type { BillingOverview } from "./billing";
import type { AiOverview } from "./ai";
export type CourseId = "en" | "es" | "de";
export type ExerciseType =
  | "choice"
  | "pairs"
  | "arrange"
  | "fill"
  | "write"
  | "listen";
export type Answer = string | string[] | Record<string, string>;
export interface Exercise {
  id: string;
  concept: string;
  type: ExerciseType;
  instruction: string;
  prompt: string;
  options?: string[];
  words?: string[];
  pairs?: { left: string; right: string }[];
  transcript?: string;
  answers: string[];
  explanation: string;
}
export type PublicExercise = Omit<Exercise, "answers" | "explanation">;
export interface Lesson {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  exercises: Exercise[];
}
export interface Unit {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: Lesson[];
}
export interface Preferences {
  courseId: CourseId;
  level: "beginner" | "basics";
  goal: "travel" | "daily" | "work";
  dailyMinutes: 5 | 10 | 15;
  timezone: string;
  sound: boolean;
  reducedMotion: boolean;
  onboarded: boolean;
}
export interface Notion {
  concept: string;
  exerciseId: string;
  attempts: number;
  successes: number;
  errors: number;
  lastPractice: string;
  nextReview: string;
  interval: number;
  streak: number;
}
export interface Feedback {
  correct: boolean;
  expected: string;
  explanation: string;
  answer: Answer;
}
export interface LessonResult {
  source?: "ai";
  courseId?: CourseId;
  runId: string;
  lessonId: string | null;
  review: boolean;
  correct: number;
  total: number;
  xp: number;
  minutes: number;
  completedAt: string;
  toReview: string[];
}
export interface RunView {
  source?: "ai";
  courseId: CourseId;
  id: string;
  lessonId: string | null;
  review: boolean;
  title: string;
  index: number;
  total: number;
  exercise: PublicExercise | null;
  feedback: Feedback | null;
  result: LessonResult | null;
}
export interface AppState {
  ai: AiOverview;
  allCompleted: string[];
  courseProgress: { id: CourseId; completed: number; total: number }[];
  billing: BillingOverview;
  user: { id: string; name: string; email: string | null; guest: boolean };
  preferences: Preferences;
  completed: string[];
  activeRun: string | null;
  notions: Notion[];
  history: LessonResult[];
  stats: {
    xp: number;
    streak: number;
    todayMinutes: number;
    todayXp: number;
    learningDays: number;
    accuracy: number;
    totalAnswers: number;
    activity: { date: string; minutes: number }[];
  };
  review: { due: number; practiced: number };
}
