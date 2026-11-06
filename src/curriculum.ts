import { getCourse, nextLesson, isUnlocked } from "../shared/courses";
import { useApp } from "./context";
export function useCurriculum() {
  const { state } = useApp();
  const language = getCourse(state.preferences.courseId);
  return {
    language,
    course: language.units,
    lessons: language.units.flatMap((unit) => unit.lessons),
    nextLesson: (completed: string[]) => nextLesson(completed, language.id),
    isUnlocked,
  };
}
