import {
  ArrowUpRight,
  ArrowRight,
  Clock3,
  Sparkles,
  Flame,
  Check,
  LockKeyhole,
  Play,
  ChevronRight,
  BookOpen,
  Target,
  Leaf,
  RotateCcw,
  Flag,
} from "lucide-react";
import { isUnlocked } from "../shared/courses";
import { useCurriculum } from "./curriculum";
import type { Unit } from "../shared/types";
import { useApp } from "./context";
import { Fox, unitIcons } from "./ui";

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
export default function Dashboard() {
  const { course, lessons, nextLesson, language } = useCurriculum();
  const { state, navigate, startLesson, startReview, busy, openOnboarding } =
    useApp();
  const recommended = nextLesson(state.completed);
  const unit =
    course.find((u) => u.lessons.some((l) => l.id === recommended?.id)) ??
    course[5];
  const unitIndex = course.indexOf(unit);
  const unitDone = unit.lessons.filter((l) =>
    state.completed.includes(l.id),
  ).length;
  const goalPercent = Math.min(
    100,
    (state.stats.todayMinutes / state.preferences.dailyMinutes) * 100,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow small">
            {language.name.toUpperCase()} · VOTRE RENDEZ-VOUS QUOTIDIEN
          </div>
          <h1>
            {language.id === "de"
              ? "Hallo"
              : language.id === "es"
                ? "Hola"
                : "Hello"}
            , {state.user.guest ? "vous" : state.user.name}{" "}
            <span className="greeting-sun" aria-hidden="true">
              ✳︎
            </span>
          </h1>
          <p>Une nouvelle journée, un petit pas de plus.</p>
        </div>
        <span className="level-tag">
          <span className="status-dot" /> Débutant{" "}
          <span className="tag-separator">/</span> {language.name}
        </span>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section className="hero-card" aria-labelledby="hero-title">
            <div className="hero-copy">
              <span className="hero-eyebrow">
                <span className="status-dot" />
                {recommended
                  ? "ON CONTINUE L’AVENTURE ?"
                  : "QUEL CHEMIN PARCOURU !"}
              </span>
              <h2 id="hero-title">
                {recommended ? (
                  <>
                    {state.completed.length
                      ? "Le prochain mot"
                      : "Tout commence"}
                    <br />
                    {state.completed.length ? (
                      "vous attend."
                    ) : (
                      <>
                        par un{" "}
                        <span>
                          {language.id === "de"
                            ? "hallo."
                            : language.id === "es"
                              ? "hola."
                              : "hello."}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    18 leçons.
                    <br />
                    Et tant à explorer.
                  </>
                )}
              </h2>
              <p>
                {recommended
                  ? state.completed.length
                    ? "Un peu de pratique, un peu de confiance. Vous avancez à chaque leçon."
                    : "Un mot, puis un autre. Et bientôt, votre première conversation."
                  : "Faites vivre vos nouveaux mots avec une petite séance de révision."}
              </p>
              <button
                className="button primary hero-button"
                disabled={busy}
                onClick={() =>
                  state.activeRun
                    ? navigate(`lesson/${state.activeRun}`)
                    : recommended
                      ? void startLesson(recommended.id)
                      : void startReview()
                }
              >
                {state.activeRun
                  ? "Reprendre ma leçon"
                  : recommended
                    ? "Commencer la leçon"
                    : "Réviser mes acquis"}
                <ArrowRight size={19} />
              </button>
              <div className="hero-meta">
                <Clock3 size={14} />
                <span>5 minutes</span>
                <span className="meta-dot">·</span>
                <span>8 exercices</span>
                <span className="meta-dot">·</span>
                <span>À votre rythme</span>
              </div>
            </div>
            <div className="hero-art">
              <Fox scene />
              <span className="mascot-note">
                Pip croit en vous.
                <svg viewBox="0 0 40 25" aria-hidden="true">
                  <path
                    d="M2 4c17 20 24 14 31 4m-10 0h11l-3 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </div>
          </section>
          <div className="section-heading">
            <div>
              <span className="eyebrow small">CHAQUE ÉTAPE COMPTE</span>
              <h2>Votre parcours</h2>
            </div>
            <button className="text-button" onClick={() => navigate("path")}>
              Tout le parcours
              <ArrowUpRight size={17} />
            </button>
          </div>
          <section className="current-unit card">
            <div className="unit-summary">
              <div className={`unit-symbol ${unit.color}`}>
                {(() => {
                  const Icon = unitIcons[unit.icon];
                  return <Icon size={25} strokeWidth={1.6} />;
                })()}
              </div>
              <div className="unit-summary-text">
                <span className="eyebrow small">
                  UNITÉ {String(unitIndex + 1).padStart(2, "0")}
                </span>
                <h3>{unit.title}</h3>
                <p>{unit.description}</p>
              </div>
              <span className="unit-fraction">
                {unitDone}
                <span> / 3</span>
              </span>
            </div>
            <LessonSteps unit={unit} />
          </section>
          <div className="bottom-cards">
            <button
              className="review-teaser"
              onClick={() => navigate("review")}
            >
              <span className="teaser-icon">
                <RotateCcw size={24} />
              </span>
              <div>
                <span className="eyebrow small">LES BONS MOTS RESTENT</span>
                <h3>Un petit rappel ?</h3>
                <p>
                  {state.review.practiced
                    ? `${state.review.due} notion${state.review.due > 1 ? "s" : ""} à revoir aujourd’hui.`
                    : "Vos nouveaux mots, pour longtemps."}
                </p>
              </div>
              <ArrowUpRight size={22} />
            </button>
            <div className="gentle-note">
              <Leaf size={20} />
              <p>
                Pas besoin d’être parfait.
                <br />
                <strong>Juste d’être là, un peu chaque jour.</strong>
              </p>
            </div>
          </div>
        </div>
        <aside className="dashboard-aside">
          <section className="daily-card card">
            <div className="card-heading">
              <h2>Votre objectif du jour</h2>
              <Target size={19} />
            </div>
            <div className="goal-ring">
              <svg viewBox="0 0 160 160" aria-hidden="true">
                <circle
                  cx="80"
                  cy="80"
                  r="67"
                  fill="none"
                  stroke="#eeeee6"
                  strokeWidth="9"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="67"
                  fill="none"
                  stroke="#e98258"
                  strokeWidth="9"
                  pathLength="100"
                  strokeDasharray={`${goalPercent} 100`}
                  strokeLinecap="round"
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div>
                <strong>
                  {state.stats.todayMinutes}
                  <span> / {state.preferences.dailyMinutes}</span>
                </strong>
                <span>minutes</span>
              </div>
            </div>
            <h3>
              {goalPercent >= 100
                ? "Objectif atteint. Bravo !"
                : "Les petits efforts font les grands progrès."}
            </h3>
            <p>
              {goalPercent >= 100
                ? "Vous avez tenu votre rendez-vous avec les langues."
                : "Une leçon suffit pour prendre un peu d’avance sur hier."}
            </p>
            <button className="text-button subtle" onClick={openOnboarding}>
              Ajuster mon objectif
              <ChevronRight size={15} />
            </button>
          </section>
          <section className="streak-card card">
            <div className="card-heading">
              <h2>Gardez l’étincelle</h2>
              <Flame size={20} className="coral-text" />
            </div>
            <div className="streak-total">
              <strong>{state.stats.streak}</strong>
              <div>
                <b>jour{state.stats.streak > 1 ? "s" : ""} de suite</b>
                <span>
                  {state.stats.streak
                    ? "Votre régularité prend vie."
                    : "Votre histoire commence ici."}
                </span>
              </div>
            </div>
            <div
              className="week-days"
              role="group"
              aria-label="Vos sept derniers jours"
            >
              {state.stats.activity.map((day, i) => (
                <div key={day.date} className={i === 6 ? "today" : ""}>
                  <span>
                    {new Intl.DateTimeFormat("fr", {
                      weekday: "narrow",
                      timeZone: "UTC",
                    }).format(new Date(`${day.date}T12:00:00Z`))}
                  </span>
                  <span
                    role="img"
                    className={`day-bubble ${day.minutes ? "active" : ""}`}
                    aria-label={`${day.date} : ${day.minutes} minutes`}
                  >
                    {day.minutes ? (
                      <Check size={13} />
                    ) : i === 6 ? (
                      <span />
                    ) : (
                      "·"
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="pip-note">
            <span className="note-pin" />
            <Sparkles size={22} />
            <p>
              « Un nouveau mot,
              <br />
              c’est une nouvelle porte
              <br />
              qui s’ouvre. »
            </p>
            <span>— LE PETIT MOT DE PIP</span>
          </section>
        </aside>
      </div>
      <div className="page-footnote">
        <span>
          <BookOpen size={14} /> {lessons.length} leçons pour prendre confiance
        </span>
        <span>Petit à petit, on parle plus grand.</span>
        <span>
          <Flag size={14} /> Conçu pour les francophones
        </span>
      </div>
    </>
  );
}
