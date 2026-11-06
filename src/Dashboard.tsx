import { Check, LockKeyhole, Play } from "lucide-react";
import { isUnlocked } from "../shared/courses";
import type { Unit } from "../shared/types";
import { useApp } from "./context";

export function LessonSteps({ unit }: { unit: Unit }) {
  const { state, startLesson, busy } = useApp();
  return (
    <div className="lesson-steps">
      {unit.lessons.map((lesson, i) => {
        const done = state.completed.includes(lesson.id);
        const unlocked = isUnlocked(lesson.id, state.allCompleted);
        return (
          <div
            className={`lesson-step ${done ? "done" : unlocked ? "current" : "locked"}`}
            key={lesson.id}
          >
            <button
              disabled={!unlocked || busy}
              onClick={() => void startLesson(lesson.id)}
              aria-label={`${done ? "Refaire" : unlocked ? "Commencer" : "Verrouillée :"} ${lesson.title}`}
              title={!unlocked ? "Terminez la leçon précédente" : lesson.title}
            >
              {done ? (
                <Check size={22} strokeWidth={3} />
              ) : unlocked ? (
                <Play size={20} fill="currentColor" />
              ) : (
                <LockKeyhole size={19} />
              )}
            </button>
            <span className="lesson-number">LEÇON {i + 1}</span>
            <strong>{lesson.title}</strong>
            <span className="step-caption">
              {done
                ? "À refaire quand vous voulez"
                : unlocked
                  ? "À vous de jouer"
                  : "Bientôt à vous"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { default } from "./GameHub";
