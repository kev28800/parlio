import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Crown,
  Flame,
  Gamepad2,
  Map,
  MessageCircle,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { localDay } from "../shared/learning";
import type { CourseId } from "../shared/types";
import { useApp } from "./context";
import { useCurriculum } from "./curriculum";
import { Fox } from "./ui";
import WorldPicker from "./WorldPicker";

export default function GameHub() {
  const {
    state,
    navigate,
    startLesson,
    startReview,
    changePreferences,
    openOnboarding,
    busy,
  } = useApp();
  const { course, language, nextLesson, lessons } = useCurriculum();
  const [switching, setSwitching] = useState(false);
  const next = nextLesson(state.completed);
  const unitIndex = Math.max(
    0,
    course.findIndex((unit) =>
      unit.lessons.some((lesson) => lesson.id === next?.id),
    ),
  );
  const level = Math.floor(state.stats.xp / 120) + 1;
  const levelXp = state.stats.xp % 120;
  const today = localDay(new Date(), state.preferences.timezone);
  const todayHistory = state.history.filter(
    (entry) =>
      localDay(new Date(entry.completedAt), state.preferences.timezone) ===
      today,
  );
  const quests = [
    {
      name: "Avancer dans l’aventure",
      description: `Terminer une séance en ${language.name.toLowerCase()}`,
      done: todayHistory.length > 0,
      Icon: Swords,
      action: () => void play(),
    },
    {
      name: "Faire durer les mots",
      description: `Terminer une révision en ${language.name.toLowerCase()}`,
      done: todayHistory.some((r) => r.review && !r.source),
      Icon: RotateCcw,
      action: () => navigate("review"),
    },
    {
      name: "Garder le rythme",
      description: `Pratiquer ${state.preferences.dailyMinutes} minutes, toutes langues`,
      done: state.stats.todayMinutes >= state.preferences.dailyMinutes,
      Icon: Flame,
      action: openOnboarding,
    },
  ];
  async function play() {
    if (state.activeRun) navigate(`lesson/${state.activeRun}`);
    else if (next) await startLesson(next.id);
    else await startReview();
  }
  async function choose(id: CourseId) {
    setSwitching(true);
    await changePreferences({ courseId: id });
    setSwitching(false);
  }
  return (
    <div className="game-hub">
      <div className="game-heading">
        <div>
          <span className="game-eyebrow">
            <span /> VOTRE CAMP DE BASE
          </span>
          <h1>
            {language.id === "es"
              ? "Hola"
              : language.id === "de"
                ? "Hallo"
                : "Hello"}
            , {state.user.guest ? "vous" : state.user.name}
            <span className="game-greeting" aria-hidden="true">
              ✦
            </span>
          </h1>
          <p>Prêt pour une nouvelle aventure ? Chaque mot vous fait avancer.</p>
        </div>
        <div className="player-rank">
          <span>
            <Gamepad2 size={22} />
          </span>
          <div>
            <strong>Niveau de jeu {level}</strong>
            <small>{levelXp} / 120 XP vers le suivant</small>
            <span className="rank-progress">
              <span style={{ width: `${(100 * levelXp) / 120}%` }} />
            </span>
          </div>
        </div>
      </div>
      <div className="game-dashboard-grid">
        <div className="game-main-column">
          <section className="adventure-hero" aria-labelledby="adventure-title">
            <div className="adventure-copy">
              <span className="adventure-tag">
                <Swords size={14} /> {language.name} ·{" "}
                {next
                  ? `Unité ${String(unitIndex + 1).padStart(2, "0")}`
                  : "Parcours terminé"}
              </span>
              <h2 id="adventure-title">
                Votre prochaine
                <br />
                <span>victoire commence ici.</span>
              </h2>
              <p>
                {next
                  ? `Prochaine étape : ${next.title}. Écoutez, associez, traduisez… et faites grandir vos acquis.`
                  : "Les 18 leçons sont terminées. Gardez vos acquis en forme avec les révisions."}
              </p>
              <button
                className="button game-play"
                disabled={busy}
                onClick={() => void play()}
              >
                <Play size={18} fill="currentColor" />
                {state.activeRun
                  ? "Reprendre ma leçon"
                  : next
                    ? "Commencer la leçon"
                    : "Réviser mes acquis"}
                <ArrowRight size={17} />
              </button>
              <span className="adventure-meta">
                <BookOpen size={13} />{" "}
                {next
                  ? "8 exercices · environ 5 minutes"
                  : "Une séance à votre rythme"}
              </span>
            </div>
            <div className="adventure-art">
              <div className="game-planet planet-one" />
              <div className="game-planet planet-two" />
              <span className="art-spark art-spark-one" aria-hidden="true">
                ✦
              </span>
              <span className="art-spark art-spark-two" aria-hidden="true">
                ✧
              </span>
              <div className="pip-platform">
                <Fox happy />
                <span />
              </div>
              <div className="pip-speech">
                <Sparkles size={14} /> On joue ?
              </div>
            </div>
          </section>
          <section
            className="game-menu-section"
            aria-labelledby="game-menu-title"
          >
            <div className="game-section-heading">
              <div>
                <span className="game-eyebrow">À VOUS DE JOUER</span>
                <h2 id="game-menu-title">Choisissez votre mode</h2>
              </div>
              <span className="menu-controller">
                <Gamepad2 size={22} />
              </span>
            </div>
            <nav className="game-mode-grid" aria-label="Menu des modes de jeu">
              <a className="game-mode mode-map" href="#path">
                <span className="game-mode-icon">
                  <Map size={26} />
                </span>
                <span className="mode-number">01</span>
                <h3>Carte de l’aventure</h3>
                <p>6 étapes, des niveaux à débloquer.</p>
                <div>
                  <span>
                    {state.completed.length} / {lessons.length} leçons
                  </span>
                  <ArrowUpRight size={18} />
                </div>
              </a>
              <a className="game-mode mode-training" href="#review">
                <span className="game-mode-icon">
                  <RotateCcw size={26} />
                </span>
                <span className="mode-number">02</span>
                <h3>Entraînement</h3>
                <p>Retrouvez les mots qui comptent.</p>
                <div>
                  <span>
                    {state.review.due
                      ? `${state.review.due} notion${state.review.due > 1 ? "s" : ""} à revoir`
                      : state.review.practiced
                        ? "Vos acquis vous attendent"
                        : "Après une première leçon"}
                  </span>
                  <ArrowUpRight size={18} />
                </div>
              </a>
              <a className="game-mode mode-collection" href="#profile">
                <span className="game-mode-icon">
                  <Trophy size={26} />
                </span>
                <span className="mode-number">03</span>
                <h3>Collection</h3>
                <p>Vos badges et votre progression.</p>
                <div>
                  <span>{state.stats.xp} XP au total</span>
                  <ArrowUpRight size={18} />
                </div>
              </a>
              <a className="game-mode mode-tutor" href="#tutor">
                <span className="game-mode-icon">
                  <MessageCircle size={26} />
                </span>
                <span className="mode-number">04</span>
                <h3>Salon du tuteur</h3>
                <p>Un espace pour pratiquer l’échange.</p>
                <div>
                  <span>
                    {state.ai.configured ? "Accès Premium" : "En préparation"}
                  </span>
                  <ArrowUpRight size={18} />
                </div>
              </a>
            </nav>
          </section>
          <section className="game-worlds" aria-labelledby="worlds-title">
            <div className="game-section-heading">
              <div>
                <span className="game-eyebrow">3 LANGUES, 3 UNIVERS</span>
                <h2 id="worlds-title">Changez de monde</h2>
              </div>
              <span className="game-world-hint">
                Vos progrès sont conservés.
              </span>
            </div>
            <WorldPicker
              onChoose={(id) => void choose(id)}
              busy={switching || busy}
              compact
            />
          </section>
        </div>
        <aside className="game-side-column">
          <section className="daily-quests" aria-labelledby="quests-title">
            <div className="game-side-title">
              <span className="quest-title-icon">
                <Target size={20} />
              </span>
              <div>
                <span className="game-eyebrow">UN PEU CHAQUE JOUR</span>
                <h2 id="quests-title">Missions du jour</h2>
              </div>
              <span className="quest-count">
                {quests.filter((q) => q.done).length}/3
              </span>
            </div>
            <p className="quest-note">
              Vos séances terminées font progresser ces objectifs.
            </p>
            <div className="quest-list">
              {quests.map(({ name, description, done, Icon, action }) => (
                <button
                  key={name}
                  className={`quest-row ${done ? "quest-done" : ""}`}
                  onClick={action}
                  disabled={busy}
                >
                  <span className="quest-icon">
                    <Icon size={18} />
                  </span>
                  <span>
                    <strong>{name}</strong>
                    <small>{description}</small>
                  </span>
                  <span
                    className="quest-check"
                    aria-label={
                      done ? "Objectif atteint" : "Objectif à réaliser"
                    }
                  >
                    {done ? <Check size={13} /> : <ChevronRight size={15} />}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="game-streak">
            <div className="game-side-title">
              <Flame size={21} />
              <h2>Gardez la flamme</h2>
            </div>
            <div className="game-streak-total">
              <strong>{state.stats.streak}</strong>
              <div>
                jour{state.stats.streak > 1 ? "s" : ""} de suite
                <span>
                  {state.stats.streak
                    ? "Votre régularité prend forme."
                    : "La série commence avec vous."}
                </span>
              </div>
            </div>
            <div
              className="game-week"
              role="group"
              aria-label="Vos sept derniers jours"
            >
              {state.stats.activity.map((day, index) => (
                <div key={day.date}>
                  <span>
                    {new Intl.DateTimeFormat("fr", {
                      weekday: "narrow",
                      timeZone: "UTC",
                    }).format(new Date(`${day.date}T12:00:00Z`))}
                  </span>
                  <span
                    className={`${day.minutes ? "day-complete" : ""} ${index === 6 ? "day-current" : ""}`}
                    role="img"
                    aria-label={`${day.date} : ${day.minutes} minutes`}
                  >
                    {day.minutes ? <Check size={14} /> : <span />}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <section className="game-progress-card">
            <div className="game-side-title">
              <Star size={20} />
              <h2>Votre progression</h2>
            </div>
            <div className="game-total-xp">
              <Zap size={26} fill="currentColor" />
              <strong>{state.stats.xp}</strong>
              <span>XP</span>
            </div>
            <p>Chaque séance terminée fait avancer votre niveau de jeu.</p>
            <div className="game-progress-line">
              <span>
                {state.completed.length} leçons en {language.name.toLowerCase()}
              </span>
              <strong>
                {Math.round((100 * state.completed.length) / lessons.length)} %
              </strong>
            </div>
            <div className="game-course-meter">
              <span
                style={{
                  width: `${(100 * state.completed.length) / lessons.length}%`,
                }}
              />
            </div>
            <button
              className="text-button"
              onClick={() => navigate("insights")}
            >
              Voir mon bilan <ArrowUpRight size={15} />
            </button>
          </section>
          <button
            className="game-premium-card"
            onClick={() => navigate("premium")}
          >
            <span>
              <Crown size={22} />
            </span>
            <h3>Envie d’aller plus loin ?</h3>
            <p>Découvrez votre bilan détaillé avec Parlio Premium.</p>
            <strong>
              Découvrir Premium <ArrowRight size={15} />
            </strong>
          </button>
        </aside>
      </div>
      <p className="game-footer-note">
        <Sparkles size={14} /> Vos points viennent de votre pratique. Votre
        aventure avance à votre rythme.
      </p>
    </div>
  );
}
