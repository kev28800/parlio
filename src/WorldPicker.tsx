import { ArrowUpRight, Check } from "lucide-react";
import { courses } from "../shared/courses";
import type { CourseId } from "../shared/types";
import { useApp } from "./context";

export default function WorldPicker({
  onChoose,
  busy = false,
  compact = false,
}: {
  onChoose: (id: CourseId) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const { state } = useApp();
  return (
    <div
      className={`world-picker ${compact ? "compact-worlds" : "site-language-grid"}`}
    >
      {courses.map((course, index) => {
        const progress = state.courseProgress.find(
          (entry) => entry.id === course.id,
        )!;
        const current = state.preferences.courseId === course.id;
        return (
          <article
            className={`world-card site-language-card language-${course.id} ${current ? "current-world" : ""}`}
            key={course.id}
          >
            <div className="world-card-top">
              <span>MONDE {String(index + 1).padStart(2, "0")}</span>
              <span className="world-flag" aria-hidden="true">
                {course.flag}
              </span>
            </div>
            <div className="world-word" lang={course.id}>
              {course.id === "en"
                ? "Hello!"
                : course.id === "es"
                  ? "¡Hola!"
                  : "Hallo!"}
            </div>
            <div className="world-card-title">
              <h3>{course.name}</h3>
              {compact && current && (
                <span className="world-current">
                  <Check size={11} /> En cours
                </span>
              )}
            </div>
            <p>Débutant · 6 unités · 18 leçons</p>
            <div
              className="world-progress"
              role="progressbar"
              aria-label={`Progrès en ${course.name.toLowerCase()}`}
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.completed}
            >
              <span
                style={{
                  width: `${(100 * progress.completed) / progress.total}%`,
                }}
              />
            </div>
            <div className="world-card-bottom">
              <span>
                {progress.completed} / {progress.total} leçons terminées
              </span>
              <button
                disabled={busy}
                onClick={() => onChoose(course.id)}
                aria-label={`Apprendre l’${course.name.toLowerCase()}`}
              >
                <span>{compact ? "Choisir" : "Explorer"}</span>
                <ArrowUpRight size={17} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
