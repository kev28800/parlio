import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Plane,
  Coffee,
  BriefcaseBusiness,
  Sprout,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { api } from "./api";
import { useApp } from "./context";
import { Fox, Modal } from "./ui";
import type { AppState, Preferences } from "../shared/types";

export function Onboarding({ onClose }: { onClose: () => void }) {
  const { state, setState, reportError } = useApp();
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState(state.preferences);
  const [saving, setSaving] = useState(false);
  const update = (change: Partial<Preferences>) =>
    setPreferences((previous) => ({ ...previous, ...change }));
  async function finish() {
    setSaving(true);
    try {
      const timezone = state.preferences.onboarded
        ? preferences.timezone
        : Intl.DateTimeFormat().resolvedOptions().timeZone;
      const reducedMotion =
        preferences.reducedMotion ||
        (!state.preferences.onboarded &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches);
      setState(
        await api<AppState>("/preferences", "PATCH", {
          ...preferences,
          timezone,
          reducedMotion,
          onboarded: true,
        }),
      );
      onClose();
    } catch (e) {
      reportError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const titles = [
    "On part d’où ?",
    "Qu’est-ce qui vous donne envie ?",
    "Un petit rendez-vous quotidien ?",
  ];
  return (
    <Modal title="Faisons connaissance" onClose={onClose} wide>
      <div className="onboarding">
        <div className="onboarding-art">
          <span className="welcome-stamp">ENCHANTÉ, MOI C’EST PIP !</span>
          <Fox happy />
          <h2>
            Un petit pas.
            <br />
            Un nouveau monde.
          </h2>
          <p>
            Votre apprentissage commence avec vous.
            <br />
            On trouve votre rythme ?
          </p>
        </div>
        <div className="onboarding-content">
          <span className="eyebrow small">
            VOTRE PARCOURS · {step + 1} SUR 3
          </span>
          <div className="onboarding-dots">
            {[0, 1, 2].map((i) => (
              <span key={i} className={i <= step ? "active" : ""} />
            ))}
          </div>
          <h3>{titles[step]}</h3>
          <p>
            {step === 0
              ? "Pas de test, pas de pression. Juste votre ressenti."
              : step === 1
                ? "Pour les premiers mots, nous garderons les mêmes bases."
                : "Même cinq minutes peuvent devenir une belle habitude."}
          </p>
          <div className="onboarding-choices">
            {step === 0
              ? (
                  [
                    [
                      "beginner",
                      "Je débute",
                      "On commence par les premiers mots.",
                      Sprout,
                    ],
                    [
                      "basics",
                      "J’ai quelques bases",
                      "Je consolide et je prends confiance.",
                      BookOpen,
                    ],
                  ] as const
                ).map(([id, title, description, Icon]) => (
                  <button
                    key={id}
                    className={`onboarding-choice ${preferences.level === id ? "selected" : ""}`}
                    aria-pressed={preferences.level === id}
                    onClick={() => update({ level: id })}
                  >
                    <Icon size={24} />
                    <span>
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </span>
                    <span className="choice-radio">
                      {preferences.level === id && <Check size={13} />}
                    </span>
                  </button>
                ))
              : step === 1
                ? (
                    [
                      [
                        "travel",
                        "Partir en voyage",
                        "Me sentir à l’aise ailleurs.",
                        Plane,
                      ],
                      [
                        "daily",
                        "La vie quotidienne",
                        "Échanger, rencontrer, comprendre.",
                        Coffee,
                      ],
                      [
                        "work",
                        "Le travail",
                        "Ouvrir de nouvelles portes.",
                        BriefcaseBusiness,
                      ],
                    ] as const
                  ).map(([id, title, description, Icon]) => (
                    <button
                      key={id}
                      className={`onboarding-choice ${preferences.goal === id ? "selected" : ""}`}
                      aria-pressed={preferences.goal === id}
                      onClick={() => update({ goal: id })}
                    >
                      <Icon size={23} />
                      <span>
                        <strong>{title}</strong>
                        <small>{description}</small>
                      </span>
                      <span className="choice-radio">
                        {preferences.goal === id && <Check size={13} />}
                      </span>
                    </button>
                  ))
                : ([5, 10, 15] as const).map((minutes, i) => (
                    <button
                      key={minutes}
                      className={`onboarding-choice ${preferences.dailyMinutes === minutes ? "selected" : ""}`}
                      aria-pressed={preferences.dailyMinutes === minutes}
                      onClick={() => update({ dailyMinutes: minutes })}
                    >
                      <span className="minute-option">
                        {minutes}
                        <small>min</small>
                      </span>
                      <span>
                        <strong>
                          {
                            [
                              "En douceur",
                              "Un peu chaque jour",
                              "L’élan est là",
                            ][i]
                          }
                        </strong>
                        <small>
                          {[1, 2, 3][i]} leçon{minutes > 5 ? "s" : ""} par jour
                        </small>
                      </span>
                      <span className="choice-radio">
                        {preferences.dailyMinutes === minutes && (
                          <Check size={13} />
                        )}
                      </span>
                    </button>
                  ))}
          </div>
          <div className="onboarding-actions">
            {step > 0 && (
              <button
                className="icon-button"
                aria-label="Étape précédente"
                onClick={() => setStep(step - 1)}
                disabled={saving}
              >
                <ArrowLeft size={21} />
              </button>
            )}
            <button
              className="button primary"
              disabled={saving}
              onClick={() => (step < 2 ? setStep(step + 1) : void finish())}
            >
              {saving
                ? "Enregistrement…"
                : step === 2
                  ? "C’est parti !"
                  : "Continuer"}
              <ArrowRight size={18} />
            </button>
          </div>
          <span className="onboarding-reassurance">
            Gratuit, sans carte bancaire ni compte obligatoire.
          </span>
        </div>
      </div>
    </Modal>
  );
}
export function Auth({
  initialMode,
  onClose,
}: {
  initialMode: "register" | "login";
  onClose: () => void;
}) {
  const { setState, state } = useApp();
  const [mode, setMode] = useState(initialMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit() {
    setSaving(true);
    setError("");
    try {
      setState(
        await api<AppState>(`/auth/${mode}`, "POST", {
          email: email.trim(),
          password,
          ...(mode === "register" ? { name: name.trim() } : {}),
        }),
      );
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      title={
        mode === "register"
          ? "Gardons vos petits progrès."
          : "Heureux de vous retrouver."
      }
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <div className="auth-intro">
        <span className="auth-symbol">
          <ShieldCheck size={26} />
        </span>
        <p>
          {mode === "register"
            ? "Un compte gratuit pour retrouver vos langues, où que vous soyez. Votre progression d’essai sera automatiquement conservée."
            : "Connectez-vous pour reprendre votre parcours et vos révisions."}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <fieldset disabled={saving} className="auth-fields">
          {mode === "register" && (
            <label className="field">
              Votre prénom
              <input
                autoComplete="given-name"
                placeholder="Comment vous appelle-t-on ?"
                maxLength={40}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
          )}
          <label className="field">
            Votre adresse e-mail
            <input
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.fr"
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Votre mot de passe
            <input
              type="password"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder="Au moins 10 caractères"
              minLength={10}
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="button primary full-width">
            {saving
              ? "Un instant…"
              : mode === "register"
                ? "Créer mon compte gratuit"
                : "Me connecter"}
            <ArrowRight size={18} />
          </button>
        </fieldset>
      </form>
      <p className="auth-switch">
        {mode === "register" ? "Déjà un compte ?" : "Première visite ?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "register" ? "login" : "register");
            setError("");
            setPassword("");
          }}
          disabled={saving}
        >
          {mode === "register" ? "Se connecter" : "Créer un compte"}
        </button>
      </p>
      {mode === "login" && state.stats.xp > 0 && state.user.guest && (
        <p className="fine-print">
          Votre essai actuel ne remplace pas la progression d’un compte
          existant. Pour conserver cet essai, créez plutôt un nouveau compte.
        </p>
      )}
      <p className="fine-print">
        Aucune publicité. Votre compte et vos données peuvent être supprimés
        dans votre profil.
      </p>
    </Modal>
  );
}
