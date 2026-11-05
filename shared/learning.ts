import type { Answer, Exercise, Notion } from "./types";

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("en")
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .replace(/\s+/g, " ");
}
export function grade(exercise: Exercise, answer: Answer): boolean {
  if (exercise.type === "pairs") {
    if (!answer || typeof answer !== "object" || Array.isArray(answer))
      return false;
    return exercise.pairs!.every(
      (pair) =>
        typeof answer[pair.left] === "string" &&
        normalizeAnswer(answer[pair.left]) === normalizeAnswer(pair.right),
    );
  }
  const value = Array.isArray(answer)
    ? answer.join(" ")
    : typeof answer === "string"
      ? answer
      : "";
  return exercise.answers.some(
    (expected) => normalizeAnswer(expected) === normalizeAnswer(value),
  );
}
export function expectedAnswer(exercise: Exercise) {
  return exercise.type === "pairs"
    ? exercise.pairs!.map((p) => `${p.left} → ${p.right}`).join(" · ")
    : exercise.answers[0];
}
const intervals = [1, 3, 7, 14, 30];
export function practiceNotion(
  previous: Notion | undefined,
  exercise: Exercise,
  correct: boolean,
  now: Date,
): Notion {
  const spaced =
    !previous ||
    now.getTime() - new Date(previous.lastPractice).getTime() >=
      20 * 60 * 60 * 1000;
  const streak = correct ? (previous?.streak ?? 0) + (spaced ? 1 : 0) : 0;
  const interval = correct
    ? intervals[Math.max(0, Math.min(streak - 1, intervals.length - 1))]
    : 0;
  return {
    concept: exercise.concept,
    exerciseId: exercise.id,
    attempts: (previous?.attempts ?? 0) + 1,
    successes: (previous?.successes ?? 0) + Number(correct),
    errors: (previous?.errors ?? 0) + Number(!correct),
    lastPractice: now.toISOString(),
    nextReview: new Date(
      now.getTime() + (correct ? interval * 86400000 : 600000),
    ).toISOString(),
    interval,
    streak,
  };
}
export function localDay(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return `${parts.find((p) => p.type === "year")!.value}-${parts.find((p) => p.type === "month")!.value}-${parts.find((p) => p.type === "day")!.value}`;
}
export function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}
export function computeStreak(days: string[], today: string): number {
  const unique = new Set(days);
  let day = unique.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (unique.has(day)) {
    streak++;
    day = shiftDay(day, -1);
  }
  return streak;
}
