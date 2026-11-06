import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Headphones,
  Keyboard,
  MessageCircle,
  Mic,
  MicOff,
  Pause,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { getCourse } from "../shared/courses";
import { normalizeAnswer } from "../shared/learning";
import type { CourseId } from "../shared/types";
import { useApp } from "./context";
import { useBrowserVoice } from "./voice";
import { Fox } from "./ui";

export interface ReadRequest {
  id: number;
  text: string;
}
export default function OralAvatar({
  courseId,
  aiAvailable,
  thinking,
  onDraft,
  messageDraft,
  readRequest,
}: {
  courseId: CourseId;
  aiAvailable: boolean;
  thinking: boolean;
  onDraft: (text: string) => void;
  messageDraft: string;
  readRequest: ReadRequest | null;
}) {
  const { state } = useApp();
  const language = getCourse(courseId);
  const [mode, setMode] = useState<"guided" | "ai">("guided");
  const [unitIndex, setUnitIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState(false);
  const [voiceConsent, setVoiceConsent] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const lastRead = useRef(0);
  const samples = language.units[unitIndex].lessons.flatMap((lesson) => {
    const listening = lesson.exercises
      .filter((exercise) => exercise.type === "listen")
      .map((exercise) => ({
        id: exercise.id,
        phrase: exercise.transcript!,
        meaning: exercise.answers[0],
      }));
    const arranging = lesson.exercises
      .filter((exercise) => exercise.type === "arrange")
      .map((exercise) => ({
        id: exercise.id,
        phrase: exercise.answers[0],
        meaning: exercise.prompt,
      }));
    return [...listening, ...arranging];
  });
  const sample = samples[index];
  const voice = useBrowserVoice(
    language.locale,
    state.preferences.sound,
    (text) => {
      setDraft(text);
      setChecked(false);
      if (mode === "ai") onDraft(text);
    },
  );
  useEffect(() => {
    if (!readRequest || lastRead.current === readRequest.id) return;
    lastRead.current = readRequest.id;
    setMode("ai");
    voice.speak(readRequest.text);
  }, [readRequest]);
  function changeMode(value: "guided" | "ai") {
    voice.stop();
    setMode(value);
    setDraft("");
    setChecked(false);
  }
  function resetPhrase(unit: number, position: number) {
    voice.stop();
    setUnitIndex(unit);
    setIndex(position);
    setDraft("");
    setChecked(false);
  }
  const match = normalizeAnswer(draft) === normalizeAnswer(sample.phrase);
  const listening = voice.recording || voice.requesting;
  const status = voice.recording
    ? "Pip vous écoute"
    : voice.requesting
      ? "Autorisation du micro…"
      : voice.speaking
        ? "Pip parle"
        : thinking
          ? "Le tuteur prépare sa réponse"
          : "Pip est prêt";
  return (
    <section className="oral-avatar card" aria-labelledby="oral-title">
      <div className="oral-intro">
        <div>
          <span className="game-eyebrow">
            <Headphones size={13} /> L’ORAL AVEC PIP
          </span>
          <h2 id="oral-title">Et si on se parlait ?</h2>
          <p>Un compagnon pour écouter, répéter et trouver vos mots.</p>
        </div>
        <span className="level-tag">
          {language.flag} {language.name}
        </span>
      </div>
      <div className="oral-layout">
        <div
          className={`pip-stage ${voice.speaking ? "pip-speaking" : ""} ${voice.recording ? "pip-listening" : ""} ${thinking ? "pip-thinking" : ""}`}
        >
          <span className="pip-stage-orbit orbit-one" />
          <span className="pip-stage-orbit orbit-two" />
          <span className="pip-stage-star star-a" aria-hidden="true">
            ✦
          </span>
          <span className="pip-stage-star star-b" aria-hidden="true">
            ✧
          </span>
          <div className="pip-portrait">
            {imageFailed ? (
              <Fox happy />
            ) : (
              <img
                src="/images/pip-oral.png"
                alt="Pip, votre compagnon renard en illustration 3D"
                onError={() => setImageFailed(true)}
              />
            )}
          </div>
          <div className="pip-stage-floor" />
          <span className="pip-status" role="status">
            <span />
            {status}
          </span>
          <div className="pip-voice-bars" aria-hidden="true">
            {[1, 2, 3, 4, 5].map((bar) => (
              <span key={bar} />
            ))}
          </div>
          <p>Avatar illustré · voix de votre appareil</p>
        </div>
        <div className="oral-practice">
          <div
            className="oral-tabs"
            role="group"
            aria-label="Mode de pratique orale"
          >
            <button
              aria-pressed={mode === "guided"}
              onClick={() => changeMode("guided")}
            >
              <Headphones size={15} /> Pratique guidée
            </button>
            <button
              aria-pressed={mode === "ai"}
              onClick={() => changeMode("ai")}
            >
              <Sparkles size={15} /> Conversation IA
            </button>
          </div>
          {mode === "guided" ? (
            <>
              <div className="oral-lesson-picker">
                <label htmlFor="oral-unit">Situation à pratiquer</label>
                <select
                  id="oral-unit"
                  value={unitIndex}
                  onChange={(e) => resetPhrase(Number(e.target.value), 0)}
                >
                  {language.units.map((unit, i) => (
                    <option value={i} key={unit.id}>
                      {unit.title}
                    </option>
                  ))}
                </select>
                <span>
                  Phrase {index + 1} / {samples.length}
                </span>
              </div>
              <div className="oral-model">
                <span>ÉCOUTEZ, PUIS RÉPÉTEZ</span>
                <p lang={language.id}>{sample.phrase}</p>
                <small>{sample.meaning}</small>
                <button
                  className="button primary"
                  disabled={!voice.canSpeak}
                  onClick={() =>
                    voice.speaking ? voice.stop() : voice.speak(sample.phrase)
                  }
                >
                  {voice.speaking ? <Pause size={16} /> : <Volume2 size={16} />}{" "}
                  {voice.speaking ? "Arrêter la lecture" : "Écouter Pip"}
                </button>
              </div>
            </>
          ) : (
            <div className="oral-ai-explanation">
              <MessageCircle size={25} />
              <h3>Une conversation à votre rythme.</h3>
              <p>
                {aiAvailable
                  ? "Dictez votre message, relisez-le dans la conversation ci-dessous, puis envoyez-le. Utilisez le bouton d’écoute sur la réponse pour faire parler Pip."
                  : "La conversation libre nécessite l’activation de l’IA et l’accès Premium. La pratique guidée reste disponible dès maintenant."}
              </p>
            </div>
          )}
          {!voice.canSpeak && (
            <p className="voice-fallback">
              {!state.preferences.sound
                ? "L’audio est désactivé dans votre profil."
                : "Aucune voix adaptée n’est disponible sur cet appareil pour le moment."}{" "}
              Le texte reste disponible.
            </p>
          )}
          <div className="oral-input">
            <label className="oral-mic-consent">
              <input
                type="checkbox"
                checked={voiceConsent}
                disabled={listening}
                onChange={(e) => setVoiceConsent(e.target.checked)}
              />
              <span>
                J’accepte la dictée vocale du navigateur, qui peut traiter
                l’audio en ligne.
              </span>
            </label>
            <div className="oral-mic-controls">
              <button
                className={`button ${listening ? "oral-stop" : "secondary"}`}
                disabled={
                  !voice.canDictate ||
                  !voiceConsent ||
                  thinking ||
                  (mode === "ai" && !aiAvailable)
                }
                onClick={() =>
                  listening ? voice.finishDictation() : voice.startDictation()
                }
              >
                {listening ? <MicOff size={17} /> : <Mic size={17} />}{" "}
                {voice.recording
                  ? "Terminer la dictée"
                  : voice.requesting
                    ? "En attente du micro…"
                    : "Parler à Pip"}
              </button>
              <button
                className="text-button"
                onClick={() => {
                  voice.stop();
                  draftRef.current?.focus();
                }}
              >
                <Keyboard size={15} /> Utiliser le clavier
              </button>
            </div>
            {!voice.canDictate && (
              <p className="voice-fallback">
                La dictée n’est pas disponible dans ce navigateur. Utilisez le
                clavier pour continuer.
              </p>
            )}
            <label className="oral-draft-label" htmlFor="oral-draft">
              {mode === "guided"
                ? "Votre transcription ou votre texte"
                : "Votre message à relire avant envoi"}
            </label>
            <textarea
              ref={draftRef}
              id="oral-draft"
              lang={language.id}
              rows={2}
              maxLength={1200}
              value={mode === "ai" ? messageDraft : draft}
              disabled={
                listening || (mode === "ai" && (!aiAvailable || thinking))
              }
              onChange={(e) => {
                setDraft(e.target.value);
                setChecked(false);
                if (mode === "ai") onDraft(e.target.value);
              }}
              placeholder="Vos mots apparaîtront ici…"
            />
            {voice.interim && (
              <p className="oral-interim" role="status">
                Dictée en cours : {voice.interim}
              </p>
            )}
            {mode === "guided" && (
              <div className="oral-guided-actions">
                <button
                  className="button secondary"
                  disabled={!draft.trim() || listening}
                  onClick={() => setChecked(true)}
                >
                  Comparer les textes <Check size={15} />
                </button>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Phrase précédente"
                    disabled={index === 0 || listening}
                    onClick={() => resetPhrase(unitIndex, index - 1)}
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Phrase suivante"
                    disabled={index === samples.length - 1 || listening}
                    onClick={() => resetPhrase(unitIndex, index + 1)}
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            )}
            {checked && mode === "guided" && (
              <p className="oral-comparison" role="status">
                {match
                  ? "Votre transcription correspond au modèle."
                  : `Le texte diffère du modèle : « ${sample.phrase} ». Réécoutez la phrase et essayez à nouveau.`}{" "}
                La dictée peut se tromper ; cette comparaison n’évalue pas votre
                prononciation.
              </p>
            )}
            {voice.error && (
              <p className="form-error" role="alert">
                {voice.error}
              </p>
            )}
          </div>
        </div>
      </div>
      <p className="oral-privacy">
        <ShieldCheck size={15} /> Le micro démarre uniquement à votre demande.
        Les phrases guidées viennent du parcours et ne sont pas générées par une
        IA. Aucun score de prononciation n’est attribué.
      </p>
    </section>
  );
}
