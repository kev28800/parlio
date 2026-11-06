import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  MessageCircle,
  Send,
  Sparkles,
  Trash2,
  Volume2,
} from "lucide-react";
import type { RunView } from "../shared/types";
import type { TutorConversation } from "../shared/ai";
import { useApp } from "./context";
import { useCurriculum } from "./curriculum";
import { api } from "./api";
import { Spinner } from "./ui";
import OralAvatar, { type ReadRequest } from "./OralAvatar";

export default function Tutor() {
  const { state, navigate, openAuth, reportError } = useApp();
  const { language } = useCurriculum();
  const [conversation, setConversation] = useState<TutorConversation | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [readRequest, setReadRequest] = useState<ReadRequest | null>(null);
  const readSequence = useRef(0);
  const request = useRef<{ id: string; message: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const premium = state.billing.membership.premium && !state.user.guest;
  const available = premium && state.ai.configured;
  useEffect(() => {
    if (state.user.guest) return;
    let current = true;
    setLoading(true);
    api<TutorConversation>("/ai/conversation")
      .then((value) => {
        if (current) setConversation(value);
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [state.user.id, state.user.guest, language.id]);
  useEffect(() => {
    if (conversation?.messages.length || busy)
      bottom.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [conversation?.messages.length, busy]);
  async function send() {
    if (busy || !message.trim() || !consent) return;
    setBusy(true);
    setError("");
    const submitted = message.trim();
    if (!request.current || request.current.message !== submitted)
      request.current = { id: crypto.randomUUID(), message: submitted };
    try {
      const value = await api<TutorConversation>("/ai/tutor", "POST", {
        requestId: request.current.id,
        message: submitted,
        consent: true,
      });
      setConversation(value);
      setMessage("");
      request.current = null;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function practice() {
    setGenerating(true);
    setError("");
    try {
      const run = await api<RunView>("/ai/practice", "POST", { consent: true });
      navigate(`lesson/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }
  async function clear() {
    setBusy(true);
    setError("");
    try {
      setConversation(
        await api<TutorConversation>("/ai/conversation", "DELETE", {}),
      );
      request.current = null;
    } catch (e) {
      reportError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="atelier-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow small">
            L’ATELIER · {language.name.toUpperCase()}
          </span>
          <h1>
            Les mots prennent vie<span className="coral-text">.</span>
          </h1>
          <p>Écoutez Pip, prenez la parole, puis avancez à votre rythme.</p>
        </div>
        <span className="level-tag">
          <Sparkles size={16} />
          {state.ai.configured ? "Avec l’IA" : "Pratique guidée"}
        </span>
      </div>
      <OralAvatar
        key={`${state.user.id}:${language.id}`}
        courseId={language.id}
        aiAvailable={available}
        thinking={busy || generating}
        onDraft={setMessage}
        messageDraft={message}
        readRequest={readRequest}
      />
      {!available && (
        <section className="atelier-gate card">
          <Sparkles size={26} />
          <h2>
            {!state.ai.configured
              ? "La conversation IA se prépare."
              : "Un espace pour aller plus loin."}
          </h2>
          <p>
            {!state.ai.configured
              ? "La conversation libre et les exercices personnalisés IA ne sont pas encore activés. Vous pouvez déjà pratiquer à l’oral avec Pip en mode guidé, ci-dessus."
              : "Le tuteur et la séance quotidienne sont accessibles avec Premium."}
          </p>
          <div>
            <button
              className="button primary"
              onClick={() =>
                state.user.guest ? openAuth() : navigate("premium")
              }
            >
              {state.user.guest
                ? "Créer mon compte gratuit"
                : "Découvrir Premium"}
              <ArrowUpRight size={17} />
            </button>
            <button
              className="button secondary"
              onClick={() => navigate("today")}
            >
              Retrouver mes leçons <ArrowRight size={17} />
            </button>
          </div>
        </section>
      )}
      <div className="atelier-grid">
        <section className="tutor-panel card" aria-labelledby="tutor-title">
          <header>
            <div>
              <MessageCircle size={21} />
              <h2 id="tutor-title">Votre tuteur</h2>
            </div>
            {!state.user.guest && Boolean(conversation?.messages.length) && (
              <button
                className="text-button"
                disabled={busy || generating}
                onClick={() => void clear()}
              >
                <Trash2 size={15} /> Effacer
              </button>
            )}
          </header>
          <div
            className="tutor-conversation"
            role="log"
            tabIndex={0}
            aria-label="Conversation avec le tuteur"
            aria-busy={busy}
          >
            {loading ? (
              <Spinner label="Chargement de votre conversation…" />
            ) : !conversation?.messages.length ? (
              <div className="tutor-empty">
                <span>
                  <MessageCircle size={28} />
                </span>
                <h3>La conversation commence avec vous.</h3>
                <p>
                  Présentez-vous, demandez une explication, ou entraînez-vous à
                  commander un café.
                </p>
                <div className="tutor-prompts">
                  {[
                    "Aide-moi à me présenter.",
                    "Je voudrais commander un café.",
                    "Explique-moi une formule de politesse.",
                  ].map((prompt) => (
                    <button
                      key={prompt}
                      disabled={!available}
                      onClick={() => setMessage(prompt)}
                    >
                      {prompt}
                      <ArrowUpRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              conversation.messages.map((entry) => (
                <article
                  className={`tutor-message ${entry.role}`}
                  key={entry.id}
                >
                  <span>{entry.role === "user" ? "VOUS" : "TUTEUR IA"}</span>
                  <p>{entry.text}</p>
                  {entry.correction && (
                    <p className="tutor-correction">
                      <strong>À retenir</strong>
                      {entry.correction}
                    </p>
                  )}
                  {entry.nextPrompt && (
                    <p className="tutor-next">{entry.nextPrompt}</p>
                  )}
                  {entry.spokenText && (
                    <p className="tutor-spoken" lang={language.id}>
                      {entry.spokenText}
                    </p>
                  )}
                  {entry.role === "assistant" &&
                    (entry.spokenText || entry.nextPrompt) && (
                      <button
                        className="tutor-read-aloud text-button"
                        onClick={() => {
                          setReadRequest({
                            id: ++readSequence.current,
                            text: entry.spokenText || entry.nextPrompt!,
                          });
                          document
                            .getElementById("oral-title")
                            ?.scrollIntoView({
                              block: "start",
                              behavior: "instant",
                            });
                        }}
                      >
                        <Volume2 size={15} /> Écouter avec Pip
                      </button>
                    )}
                </article>
              ))
            )}
            {busy && (
              <p role="status" className="tutor-waiting">
                Le tuteur prépare sa réponse…
              </p>
            )}
            <div ref={bottom} />
          </div>
          <form
            className="tutor-form"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <label htmlFor="tutor-message">Votre message</label>
            <textarea
              id="tutor-message"
              placeholder={`Essayons quelques mots en ${language.name.toLowerCase()}…`}
              maxLength={1200}
              rows={3}
              disabled={!available || busy}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <div>
              <span>{message.length} / 1 200 caractères</span>
              <button
                className="button primary"
                disabled={
                  !available ||
                  !consent ||
                  !message.trim() ||
                  busy ||
                  generating
                }
                type="submit"
              >
                {busy ? "Envoi…" : "Envoyer"}
                <Send size={16} />
              </button>
            </div>
          </form>
        </section>
        <aside className="atelier-aside">
          <section className="daily-practice card">
            <span className="eyebrow small">VOTRE SÉANCE DU JOUR</span>
            <BookOpen size={30} />
            <h2>Une pratique qui suit votre parcours.</h2>
            <p>
              Quatre exercices sont créés à partir des notions travaillées, en
              donnant la priorité à vos erreurs.
            </p>
            <ul>
              <li>
                <Check size={16} /> Adaptée à la langue choisie
              </li>
              <li>
                <Check size={16} /> La même séance pendant la journée
              </li>
              <li>
                <Check size={16} /> Réponses et reprise sauvegardées
              </li>
            </ul>
            <button
              className="button primary full-width"
              disabled={!available || !consent || busy || generating}
              onClick={() => void practice()}
            >
              {generating ? "Préparation en cours…" : "Préparer ma séance"}
              <ArrowRight size={17} />
            </button>
            <p className="fine-print">
              Une séance par langue et par jour UTC, générée à votre demande.
              Les exercices IA complètent les leçons et ne modifient pas leur
              ordre.
            </p>
          </section>
          <section className="ai-consent card">
            <label>
              <input
                type="checkbox"
                checked={consent}
                disabled={!available || busy || generating}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                J’accepte l’envoi de mes messages et des notions utiles à OpenAI
                pour cet échange.
              </span>
            </label>
            <p>
              N’envoyez pas de données sensibles. Les 10 derniers messages au
              maximum servent de contexte. Vous pouvez effacer votre
              conversation.
            </p>
            <p>
              L’IA peut se tromper. Elle n’évalue pas la prononciation.{" "}
              {state.ai.dailyLimit} demandes maximum par jour UTC ; les
              tentatives échouées sont comptées. Le service possède aussi un
              plafond global.
            </p>
          </section>
        </aside>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
