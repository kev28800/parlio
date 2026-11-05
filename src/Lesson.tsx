import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Volume2,
  Check,
  Lightbulb,
  RotateCcw,
  Zap,
  Target,
  Clock3,
  Sparkles,
  Headphones,
  BookOpen,
  Keyboard,
  ListChecks,
  Link2,
} from "lucide-react";
import type {
  Answer,
  AppState,
  PublicExercise,
  RunView,
} from "../shared/types";
import { nextLesson } from "../shared/course";
import { useApp } from "./context";
import { api } from "./api";
import { Fox, Modal, Spinner } from "./ui";
import { conceptLabel } from "./Views";

export default function Lesson({ id }: { id: string }) {
  const { navigate, setState, reportError, state } = useApp();
  const [run, setRun] = useState<RunView | null>(null);
  const [error, setError] = useState("");
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    let current = true;
    setRun(null);
    setError("");
    api<RunView>(`/runs/${id}`)
      .then((value) => {
        if (current) setRun(value);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [id]);
  async function update(value: RunView) {
    setRun(value);
    if (value.result) {
      try {
        setState(await api<AppState>("/state"));
      } catch (e) {
        reportError((e as Error).message);
      }
    }
  }
  if (error)
    return (
      <div className="lesson-error card">
        <BookOpen size={32} />
        <h1>Retrouvons votre chemin.</h1>
        <p role="alert">{error}</p>
        <button className="button primary" onClick={() => navigate("today")}>
          Revenir à l’accueil
        </button>
      </div>
    );
  if (!run) return <Spinner label="Votre leçon se prépare…" />;
  if (run.result) return <Result run={run} />;
  return (
    <div className="lesson-page">
      <div className="lesson-top">
        <button
          className="icon-button close-lesson"
          onClick={() => setLeaving(true)}
          aria-label="Quitter la leçon"
        >
          <X size={23} />
        </button>
        <div
          className="lesson-progress"
          role="progressbar"
          aria-label="Progression de la leçon"
          aria-valuenow={run.index}
          aria-valuemin={0}
          aria-valuemax={run.total}
        >
          <span style={{ width: `${(run.index / run.total) * 100}%` }} />
        </div>
        <span className="exercise-count">
          {run.index + 1}
          <span> / {run.total}</span>
        </span>
      </div>
      <div className="lesson-context">
        <span className="eyebrow small">
          {run.review ? "UN PETIT RAPPEL" : "UNE NOUVELLE ÉTAPE"}
        </span>
        <span>{run.title}</span>
      </div>
      <Exercise
        key={run.exercise!.id}
        run={run}
        onUpdate={(value) => void update(value)}
      />
      <div className="lesson-encouragement">
        <span className="tiny-pip">
          <Fox />
        </span>
        <p>
          {
            [
              "Prenez votre temps. Chaque essai compte.",
              "Une petite pratique, une vraie différence.",
              "Une erreur ? Une occasion d’apprendre.",
            ][run.index % 3]
          }
        </p>
      </div>
      {leaving && (
        <Modal
          title="On fait une petite pause ?"
          onClose={() => setLeaving(false)}
        >
          <p className="modal-description">
            Vos réponses déjà validées sont sauvegardées. Vous pourrez reprendre
            exactement ici.
          </p>
          <div className="modal-actions">
            <button
              className="button secondary"
              onClick={() => setLeaving(false)}
            >
              Rester un peu
            </button>
            <button
              className="button primary"
              onClick={() => {
                void api<AppState>("/state")
                  .then(setState)
                  .catch((e) => reportError(e.message));
                navigate("today");
              }}
            >
              Faire une pause
              <ArrowRight size={17} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function Exercise({
  run,
  onUpdate,
}: {
  run: RunView;
  onUpdate: (run: RunView) => void;
}) {
  const { state } = useApp();
  const exercise = run.exercise!;
  const feedback = run.feedback;
  const [answer, setAnswer] = useState<Answer>(
    feedback?.answer ??
      (exercise.type === "pairs" ? {} : exercise.type === "arrange" ? [] : ""),
  );
  const [selectedWords, setSelectedWords] = useState<number[]>(() => {
    if (!feedback || !Array.isArray(feedback.answer)) return [];
    const used: number[] = [];
    for (const word of feedback.answer) {
      const index = exercise.words!.findIndex(
        (item, i) => item === word && !used.includes(i),
      );
      if (index >= 0) used.push(index);
    }
    return used;
  });
  const [pairLeft, setPairLeft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [exercise.id]);
  useEffect(() => {
    if (feedback) feedbackRef.current?.focus();
  }, [feedback]);
  const complete =
    exercise.type === "pairs"
      ? Object.keys(answer).length === exercise.pairs!.length
      : exercise.type === "arrange"
        ? selectedWords.length > 0
        : typeof answer === "string" && answer.trim().length > 0;
  async function submit() {
    if (!complete || saving) return;
    setSaving(true);
    setError("");
    try {
      onUpdate(
        await api<RunView>(`/runs/${run.id}/answer`, "POST", {
          index: run.index,
          answer,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function advance() {
    setSaving(true);
    setError("");
    try {
      onUpdate(
        await api<RunView>(`/runs/${run.id}/next`, "POST", {
          index: run.index,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  function chooseWord(index: number) {
    const next = [...selectedWords, index];
    setSelectedWords(next);
    setAnswer(next.map((i) => exercise.words![i]));
  }
  function removeWord(index: number) {
    const next = selectedWords.filter((_, i) => i !== index);
    setSelectedWords(next);
    setAnswer(next.map((i) => exercise.words![i]));
  }
  const TypeIcon =
    exercise.type === "listen"
      ? Headphones
      : exercise.type === "pairs"
        ? Link2
        : exercise.type === "write" || exercise.type === "fill"
          ? Keyboard
          : ListChecks;
  return (
    <section className="exercise-panel">
      <div className="exercise-format">
        <TypeIcon size={16} />
        {
          (
            {
              choice: "LES BONS MOTS",
              pairs: "LES PAIRES",
              arrange: "LES MOTS EN PLACE",
              fill: "LE MOT QUI MANQUE",
              write: "À VOTRE PLUME",
              listen: "À L’ÉCOUTE",
            } as const
          )[exercise.type]
        }
      </div>
      <h1 ref={headingRef} tabIndex={-1}>
        {exercise.instruction}
        <span className="coral-text">.</span>
      </h1>
      <div className="exercise-question">
        {exercise.type === "listen" ? (
          <Audio exercise={exercise} />
        ) : (
          <p>{exercise.prompt}</p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (feedback) void advance();
          else void submit();
        }}
      >
        {(exercise.type === "choice" || exercise.type === "listen") && (
          <fieldset
            className="answer-options"
            disabled={Boolean(feedback) || saving}
          >
            <legend className="sr-only">Votre réponse</legend>
            {exercise.options!.map((option, i) => (
              <label
                key={option}
                className={`answer-option ${answer === option ? "selected" : ""} ${feedback && option === feedback.expected ? "correct-answer" : ""} ${feedback && !feedback.correct && answer === option ? "wrong-answer" : ""}`}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={answer === option}
                  onChange={() => setAnswer(option)}
                />
                <span className="option-key">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
                <span className="answer-radio">
                  {answer === option && <Check size={13} />}
                </span>
              </label>
            ))}
          </fieldset>
        )}
        {exercise.type === "arrange" && (
          <div className="arrange-exercise">
            <div className="word-answer" aria-label="Votre phrase">
              {selectedWords.length ? (
                selectedWords.map((index, i) => (
                  <button
                    key={`${index}-${i}`}
                    type="button"
                    className="word-chip"
                    onClick={() => removeWord(i)}
                    disabled={Boolean(feedback) || saving}
                    aria-label={`Retirer ${exercise.words![index]}`}
                  >
                    {exercise.words![index]}
                    <X size={13} />
                  </button>
                ))
              ) : (
                <span>Choisissez les mots dans le bon ordre…</span>
              )}
            </div>
            <div className="word-bank" aria-label="Mots disponibles">
              {exercise.words!.map((word, i) => (
                <button
                  key={i}
                  type="button"
                  className={`word-chip ${selectedWords.includes(i) ? "used" : ""}`}
                  disabled={
                    Boolean(feedback) || saving || selectedWords.includes(i)
                  }
                  onClick={() => chooseWord(i)}
                >
                  {word}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="text-button reset-words"
              disabled={!selectedWords.length || Boolean(feedback) || saving}
              onClick={() => {
                setSelectedWords([]);
                setAnswer([]);
              }}
            >
              <RotateCcw size={14} />
              Recommencer la phrase
            </button>
          </div>
        )}
        {(exercise.type === "write" || exercise.type === "fill") && (
          <label className="written-answer">
            <span>
              {exercise.type === "fill"
                ? "Le mot manquant"
                : "Votre traduction en anglais"}
            </span>
            <textarea
              key={exercise.id}
              rows={exercise.type === "fill" ? 2 : 3}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              placeholder={
                exercise.type === "fill"
                  ? "Écrivez le mot ici…"
                  : "À vous de jouer…"
              }
              value={answer as string}
              onChange={(e) => setAnswer(e.target.value)}
              maxLength={1000}
              disabled={Boolean(feedback) || saving}
            />
            <small>
              Les majuscules et la ponctuation ne sont pas pénalisées.
            </small>
          </label>
        )}
        {exercise.type === "pairs" && (
          <div className="pair-exercise">
            <p className="pair-help">
              Choisissez un mot à gauche, puis sa traduction à droite.
            </p>
            <div className="pair-columns">
              <div>
                {exercise.pairs!.map((pair, i) => {
                  const linked = (answer as Record<string, string>)[pair.left];
                  return (
                    <button
                      key={pair.left}
                      type="button"
                      className={`pair-button ${pairLeft === pair.left ? "selecting" : ""} ${linked ? "linked" : ""}`}
                      aria-pressed={pairLeft === pair.left}
                      aria-label={`${pair.left}${linked ? `, associé à ${linked}` : ""}`}
                      disabled={Boolean(feedback) || saving}
                      onClick={() => setPairLeft(pair.left)}
                    >
                      <span>{pair.left}</span>
                      <span className="pair-index">{linked ? i + 1 : "·"}</span>
                    </button>
                  );
                })}
              </div>
              <div>
                {[...exercise.pairs!.slice(1), exercise.pairs![0]].map(
                  (pair) => {
                    const index = exercise.pairs!.findIndex(
                      (p) =>
                        (answer as Record<string, string>)[p.left] ===
                        pair.right,
                    );
                    return (
                      <button
                        key={pair.right}
                        type="button"
                        className={`pair-button ${index >= 0 ? "linked" : ""}`}
                        disabled={!pairLeft || Boolean(feedback) || saving}
                        onClick={() => {
                          const updated = {
                            ...(answer as Record<string, string>),
                          };
                          for (const key of Object.keys(updated))
                            if (updated[key] === pair.right)
                              delete updated[key];
                          updated[pairLeft!] = pair.right;
                          setAnswer(updated);
                          setPairLeft(null);
                        }}
                      >
                        <span>{pair.right}</span>
                        <span className="pair-index">
                          {index >= 0 ? index + 1 : "·"}
                        </span>
                      </button>
                    );
                  },
                )}
              </div>
            </div>
            <p className="pair-help">
              {Object.keys(answer).length} / {exercise.pairs!.length} paires
              associées · Cliquez à nouveau pour modifier.
            </p>
          </div>
        )}
        {feedback && (
          <div
            className={`exercise-feedback ${feedback.correct ? "positive" : "learning"}`}
            role="status"
            ref={feedbackRef}
            tabIndex={-1}
          >
            <span className="feedback-symbol">
              {feedback.correct ? <Check size={22} /> : <Lightbulb size={23} />}
            </span>
            <div>
              <h2>
                {feedback.correct
                  ? [
                      "Bien joué !",
                      "C’est exactement ça !",
                      "Un mot de plus pour vous.",
                    ][run.index % 3]
                  : "Un petit détour pour apprendre."}
              </h2>
              {!feedback.correct && (
                <p>
                  <strong>La réponse : {feedback.expected}</strong>
                </p>
              )}
              <p>{feedback.explanation}</p>
            </div>
          </div>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="exercise-bottom">
          <span>
            <ShieldIcon />
            Votre progression est sauvegardée.
          </span>
          <button
            className="button primary"
            disabled={saving || (!feedback && !complete)}
          >
            {saving
              ? "Sauvegarde…"
              : feedback
                ? run.index === run.total - 1
                  ? "Voir mon bilan"
                  : "Continuer"
                : "Vérifier ma réponse"}
            <ArrowRight size={18} />
          </button>
        </div>
      </form>
    </section>
  );
}
function ShieldIcon() {
  return <Check size={14} />;
}
function Audio({ exercise }: { exercise: PublicExercise }) {
  const { state } = useApp();
  const [fallback, setFallback] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setFallback(
        "La synthèse vocale anglaise n’est pas disponible sur cet appareil.",
      );
      return;
    }
    function voices() {
      const hasEnglish = window.speechSynthesis
        .getVoices()
        .some((v) => v.lang.toLowerCase().startsWith("en"));
      setAvailable(hasEnglish);
    }
    voices();
    window.speechSynthesis.addEventListener("voiceschanged", voices);
    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener("voiceschanged", voices);
    };
  }, []);
  function play() {
    if (!state.preferences.sound || !available) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(exercise.transcript!);
    utterance.lang = "en-GB";
    utterance.rate = 0.82;
    utterance.voice =
      window.speechSynthesis
        .getVoices()
        .find((v) => v.lang.startsWith("en-GB")) ??
      window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("en")) ??
      null;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setFallback(
        "La lecture audio a échoué. Vous pouvez lire la phrase ci-dessous.",
      );
    };
    window.speechSynthesis.speak(utterance);
  }
  const reason = !state.preferences.sound
    ? "L’audio est désactivé dans vos paramètres."
    : fallback ||
      (!available
        ? "Aucune voix anglaise n’est disponible sur cet appareil."
        : "");
  return (
    <div className="audio-exercise">
      <button
        type="button"
        className={`audio-play ${speaking ? "speaking" : ""}`}
        onClick={play}
        disabled={Boolean(reason)}
        aria-label={
          speaking ? "Réécouter la phrase" : "Écouter la phrase en anglais"
        }
      >
        <Volume2 size={31} />
      </button>
      <div>
        <strong>
          {speaking ? "À l’écoute…" : "Un mot à écouter, à réécouter."}
        </strong>
        <p>Appuyez pour lancer l’audio.</p>
      </div>
      {reason && (
        <div className="audio-fallback">
          <span>{reason} Lisez la phrase pour continuer :</span>
          <strong lang="en">{exercise.transcript}</strong>
        </div>
      )}
    </div>
  );
}
function Result({ run }: { run: RunView }) {
  const { state, startLesson, navigate, openAuth, busy } = useApp();
  const result = run.result!;
  const next = nextLesson([
    ...state.completed,
    ...(result.lessonId ? [result.lessonId] : []),
  ]);
  const accuracy = Math.round((result.correct / result.total) * 100);
  return (
    <div className="result-page">
      <div className="result-illustration">
        <span className="celebrate-star star-one">✦</span>
        <Fox happy />
        <span className="celebrate-star star-two">✧</span>
      </div>
      <span className="eyebrow small">UN PETIT PAS QUI COMPTE</span>
      <h1>
        {accuracy === 100
          ? "Vous pouvez être fier de vous."
          : "Bravo d’être allé au bout."}
      </h1>
      <p className="result-subtitle">
        {run.review
          ? "Vos mots reprennent vie."
          : `« ${run.title} » est terminée.`}{" "}
        Chaque essai vous fait avancer.
      </p>
      <div className="result-stats">
        <div className="peach">
          <Zap size={23} />
          <strong>+{result.xp}</strong>
          <span>points d’expérience</span>
        </div>
        <div className="green">
          <Target size={23} />
          <strong>
            {result.correct} / {result.total}
          </strong>
          <span>bonnes réponses</span>
        </div>
        <div className="blue">
          <Clock3 size={23} />
          <strong>{result.minutes} min</strong>
          <span>pour votre objectif</span>
        </div>
      </div>
      <div className="result-review card">
        <h2>
          {result.toReview.length ? (
            <>
              <Lightbulb size={20} />
              On les retrouvera bientôt
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Des mots qui prennent racine
            </>
          )}
        </h2>
        <p>
          {result.toReview.length
            ? "Ces notions sont ajoutées à vos révisions. Se tromper fait aussi partie du chemin."
            : "Toutes les notions de cette séance sont programmées pour une prochaine révision."}
        </p>
        {result.toReview.length > 0 && (
          <div className="result-concepts">
            {result.toReview.map((concept) => (
              <span key={concept}>{conceptLabel(concept)}</span>
            ))}
          </div>
        )}
        <button className="text-button" onClick={() => navigate("review")}>
          Mon carnet de révision
          <ArrowRight size={15} />
        </button>
      </div>
      {state.user.guest && (
        <div className="result-register">
          <div>
            <h3>On garde cette belle lancée ?</h3>
            <p>Créez un compte gratuit. Votre progression d’essai vous suit.</p>
          </div>
          <button className="button secondary" onClick={() => openAuth()}>
            Conserver mes progrès
            <ArrowRight size={16} />
          </button>
        </div>
      )}
      <div className="result-actions">
        <button className="text-button" onClick={() => navigate("today")}>
          <ArrowLeft size={17} />
          Revenir à l’accueil
        </button>
        <button
          className="button primary"
          disabled={busy}
          onClick={() => (next ? void startLesson(next.id) : navigate("path"))}
        >
          {next ? "La prochaine étape" : "Voir mon parcours"}
          <ArrowRight size={18} />
        </button>
      </div>
      <p className="result-saved">
        <Check size={14} />
        Récompense enregistrée une seule fois. Vous pouvez fermer cette page.
      </p>
    </div>
  );
}
