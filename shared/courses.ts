import { course as englishUnits } from "./course.js";
import { spanishUnits } from "./spanish.js";
import { germanUnits } from "./german.js";
import type { CourseId, Unit } from "./types";

export interface LanguageCourse {
  id: CourseId;
  name: string;
  nativeName: string;
  locale: string;
  flag: string;
  units: Unit[];
}
export const courses: LanguageCourse[] = [
  {
    id: "en",
    name: "Anglais",
    nativeName: "English",
    locale: "en-GB",
    flag: "🇬🇧",
    units: englishUnits,
  },
  {
    id: "es",
    name: "Espagnol",
    nativeName: "Español",
    locale: "es-ES",
    flag: "🇪🇸",
    units: spanishUnits,
  },
  {
    id: "de",
    name: "Allemand",
    nativeName: "Deutsch",
    locale: "de-DE",
    flag: "🇩🇪",
    units: germanUnits,
  },
];
export const courseIds = ["en", "es", "de"] as const;
export function getCourse(id: string | undefined) {
  return courses.find((course) => course.id === id) ?? courses[0];
}
export const lessons = courses.flatMap((course) =>
  course.units.flatMap((unit) => unit.lessons),
);
export const exercises = lessons.flatMap((lesson) => lesson.exercises);
export const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
export const exerciseById = new Map(
  exercises.map((exercise) => [exercise.id, exercise]),
);
export const lessonCourse = new Map(
  courses.flatMap((course) =>
    course.units.flatMap((unit) =>
      unit.lessons.map((lesson) => [lesson.id, course.id] as const),
    ),
  ),
);
export const exerciseCourse = new Map(
  courses.flatMap((course) =>
    course.units.flatMap((unit) =>
      unit.lessons.flatMap((lesson) =>
        lesson.exercises.map((exercise) => [exercise.id, course.id] as const),
      ),
    ),
  ),
);
export function isUnlocked(id: string, completed: string[]) {
  const course = getCourse(lessonCourse.get(id));
  const sequence = course.units.flatMap((unit) => unit.lessons);
  const index = sequence.findIndex((lesson) => lesson.id === id);
  return (
    index >= 0 && (index === 0 || completed.includes(sequence[index - 1].id))
  );
}
export function nextLesson(completed: string[], courseId: CourseId = "en") {
  return (
    getCourse(courseId)
      .units.flatMap((unit) => unit.lessons)
      .find((lesson) => !completed.includes(lesson.id)) ?? null
  );
}
