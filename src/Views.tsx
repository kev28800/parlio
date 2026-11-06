import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  LockKeyhole,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
  Flame,
  Target,
  ShieldCheck,
  Volume2,
  Accessibility,
  LogOut,
  Trash2,
  BookOpen,
  CircleHelp,
  Download,
  CalendarDays,
} from "lucide-react";
import { useCurriculum } from "./curriculum";
import { useApp } from "./context";
import { LessonSteps } from "./Dashboard";
import { Fox, Modal, unitIcons } from "./ui";
import { api } from "./api";
import { SubscriptionManager } from "./Premium";
import type { AppState } from "../shared/types";

export function Path() {
  const { course, language } = useCurriculum();
  const { state } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow small">LA CARTE DE VOTRE AVENTURE</div>
          <h1>
            Un mot après l’autre<span className="coral-text">.</span>
          </h1>
          <p>{language.name} · Six étapes, un niveau après l’autre.</p>
        </div>
        <span className="progress-label">
          <BookOpen size={17} />
          {state.completed.length} / 18 leçons
        </span>
      </div>
      <div className="course-progress">
        <span style={{ width: `${(state.completed.length / 18) * 100}%` }} />
      </div>
      <div className="course-list game-map">
        {course.map((unit, i) => {
          const Icon = unitIcons[unit.icon];
          const done = unit.lessons.filter((l) =>
            state.completed.includes(l.id),
          ).length;
          const available =
            i === 0 || state.completed.includes(course[i - 1].lessons[2].id);
          return (
            <section
              className={`path-unit card ${!available ? "unavailable" : ""}`}
              key={unit.id}
            >
              <div className="map-chapter">
                <span>ZONE {String(i + 1).padStart(2, "0")}</span>
                <span
                  className="map-stars"
                  aria-label={`${done} leçons terminées sur 3`}
                >
                  {[1, 2, 3].map((star) => (
                    <span
                      key={star}
                      className={done >= star ? "star-earned" : ""}
                    >
                      ★
                    </span>
                  ))}
                </span>
              </div>
              <div className="unit-summary">
                <div className={`unit-symbol ${unit.color}`}>
                  <Icon size={28} />
                </div>
                <div className="unit-summary-text">
                  <span className="eyebrow small">
                    UNITÉ {String(i + 1).padStart(2, "0")}{" "}
                    <span className="inline-status">
                      {done === 3
                        ? "· TERMINÉE"
                        : available
                          ? "· EN ROUTE"
                          : "· À VENIR"}
                    </span>
                  </span>
                  <h2>{unit.title}</h2>
                  <p>{unit.description}</p>
                </div>
                <span className="unit-fraction">
                  {done}
                  <span> / 3</span>
                </span>
              </div>
              <LessonSteps unit={unit} />
              {!available && (
                <p className="locked-note">
                  <LockKeyhole size={13} /> Terminez l’unité précédente pour
                  ouvrir cette porte.
                </p>
              )}
            </section>
          );
        })}
      </div>
      <p className="editorial-note">
        Ce premier parcours est un contenu d’initiation, sans certification de
        niveau. Une relecture pédagogique est prévue avant publication
        commerciale.
      </p>
    </>
  );
}
export function Review() {
  const { nextLesson } = useCurriculum();
  const { state, navigate, startReview, startLesson, busy } = useApp();
  const [filter, setFilter] = useState<"all" | "due" | "fragile">("all");
  const now = new Date().toISOString();
  const notions = [...state.notions]
    .filter(
      (n) =>
        filter === "all" ||
        (filter === "due" ? n.nextReview <= now : n.errors > 0),
    )
    .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  const next = nextLesson(state.completed);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow small">FAITES GRANDIR VOS ACQUIS</div>
          <h1>
            Les mots restent<span className="coral-text">.</span>
          </h1>
          <p>Un peu de révision aujourd’hui, plus de confiance demain.</p>
        </div>
        <span className="level-tag">
          <RotateCcw size={16} /> Répétition espacée
        </span>
      </div>
      <section className="review-hero">
        <div>
          <span className="eyebrow small">VOTRE RENDEZ-VOUS MÉMOIRE</span>
          <h2>
            {state.review.practiced
              ? state.review.due
                ? `${state.review.due} notion${state.review.due > 1 ? "s" : ""} vous attend${state.review.due > 1 ? "ent" : ""}.`
                : "Un pas d’avance."
              : "Tout commence par une leçon."}
          </h2>
          <p>
            {state.review.practiced
              ? "Les notions à revoir en premier, puis celles qui méritent encore un peu de pratique."
              : "Vos mots et vos phrases apparaîtront ici après vos premiers exercices."}
          </p>
          <button
            className="button primary"
            disabled={busy}
            onClick={() =>
              state.review.practiced
                ? void startReview()
                : next
                  ? void startLesson(next.id)
                  : navigate("path")
            }
          >
            {state.review.practiced
              ? "Faire une révision"
              : "Découvrir ma première leçon"}
            <ArrowRight size={18} />
          </button>
        </div>
        <div className="review-illustration">
          <div className="word-card word-back">
            thank you<span>merci</span>
          </div>
          <div className="word-card word-front">
            hello<span>bonjour</span>
            <Sparkles size={22} />
          </div>
        </div>
      </section>
      <div className="review-stats">
        <div>
          <span className="stat-icon green">
            <BookOpen />
          </span>
          <strong>{state.review.practiced}</strong>
          <span>notions rencontrées</span>
        </div>
        <div>
          <span className="stat-icon peach">
            <RotateCcw />
          </span>
          <strong>{state.review.due}</strong>
          <span>à revoir maintenant</span>
        </div>
        <div>
          <span className="stat-icon yellow">
            <Check />
          </span>
          <strong>{state.notions.filter((n) => n.streak >= 3).length}</strong>
          <span>notions bien ancrées</span>
        </div>
      </div>
      <div className="section-heading">
        <h2>Votre carnet de mots</h2>
        <div
          className="filter-tabs"
          role="group"
          aria-label="Filtrer les notions"
        >
          {(
            [
              ["all", "Toutes"],
              ["due", "À revoir"],
              ["fragile", "À consolider"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              aria-pressed={filter === id}
              className={filter === id ? "selected" : ""}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {notions.length ? (
        <div className="notion-list card">
          {notions.map((n) => (
            <div className="notion-row" key={n.concept}>
              <div
                className={`notion-mark ${n.nextReview <= now ? "peach" : "green"}`}
              >
                {n.nextReview <= now ? (
                  <RotateCcw size={18} />
                ) : (
                  <Check size={18} />
                )}
              </div>
              <div>
                <strong>{conceptLabel(n.concept)}</strong>
                <span>
                  {n.successes} réussite{n.successes > 1 ? "s" : ""} sur{" "}
                  {n.attempts} essai{n.attempts > 1 ? "s" : ""}
                </span>
              </div>
              <div className="notion-date">
                <span>
                  {n.nextReview <= now
                    ? "À revoir maintenant"
                    : `Révision ${new Intl.DateTimeFormat("fr", { day: "numeric", month: "short", timeZone: state.preferences.timezone }).format(new Date(n.nextReview))}`}
                </span>
                <small>
                  Dernière pratique :{" "}
                  {new Intl.DateTimeFormat("fr", {
                    day: "numeric",
                    month: "short",
                    timeZone: state.preferences.timezone,
                  }).format(new Date(n.lastPractice))}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <BookOpen size={34} />
          <h3>
            {state.review.practiced
              ? "Rien dans cette sélection."
              : "Un carnet encore tout neuf."}
          </h3>
          <p>
            {state.review.practiced
              ? "Choisissez un autre filtre pour retrouver vos notions."
              : "Faites une leçon pour y déposer vos premiers mots."}
          </p>
        </div>
      )}
      <details className="method-note">
        <summary>
          <CircleHelp size={17} /> Comment les révisions sont-elles choisies ?
        </summary>
        <p>
          Une erreur programme une nouvelle révision dans 10 minutes. Une
          réussite prévoit une révision dans 1 jour. Les réussites espacées d’au
          moins 20 heures augmentent progressivement cet intervalle à 3, 7, 14
          puis 30 jours. Répéter immédiatement un exercice n’allonge pas cet
          intervalle. Les notions dues sont proposées en priorité, puis les plus
          fragiles. Vous pouvez aussi réviser en avance. C’est une règle simple
          de pratique, sans prétention de validation scientifique.
        </p>
      </details>
    </>
  );
}
const conceptNames: Record<string, string> = {
  hello: "Hello · Bonjour",
  greetings: "Les salutations",
  "i-am": "Se présenter avec I am",
  thanks: "Dire merci",
  goodbye: "Prendre congé",
  name: "Donner son prénom",
  courtesy: "Les mots de politesse",
  yes: "Dire oui",
  "nice-meet": "Faire connaissance",
  "how-are-you": "Prendre des nouvelles",
  well: "Dire comment on va",
  times: "Les moments de la journée",
  please: "Demander poliment",
  "you-too": "Vous aussi",
  "numbers-small": "Les premiers nombres",
  three: "Three · Trois",
  five: "Five · Cinq",
  ten: "Ten · Dix",
  eight: "Eight · Huit",
  seven: "Seven · Sept",
  six: "Six",
  age: "Dire son âge",
  from: "Dire d’où l’on vient",
  "numbers-age": "Vingt, trente, quarante",
  "count-objects": "Compter des objets",
  "age-question": "Demander l’âge",
  phone: "Les coordonnées",
  contact: "Rester en contact",
  live: "Dire où l’on habite",
  nine: "Nine · Neuf",
  "where-live": "Demander où l’on habite",
  mother: "Mother · Mère",
  family: "La famille",
  "my-family": "Présenter ses proches",
  sister: "Sister · Sœur",
  brother: "Brother · Frère",
  parents: "Les parents",
  she: "Parler d’elle",
  pronouns: "Les pronoms personnels",
  "we-are": "Parler de nous",
  "he-is": "Parler de lui",
  they: "Parler d’eux",
  kind: "Kind · Gentil",
  adjectives: "Décrire une personne",
  happy: "Happy · Heureux",
  friend: "Friend · Ami",
  young: "Young · Jeune",
  who: "Demander qui",
  book: "Book · Livre",
  objects: "Les objets du quotidien",
  have: "Dire ce que l’on a",
  article: "A ou an",
  bag: "Bag · Sac",
  "phone-object": "Le téléphone",
  kitchen: "La cuisine",
  house: "La maison",
  in: "In · Dans",
  on: "On · Sur",
  where: "Demander où",
  work: "Le travail",
  verbs: "Les actions du quotidien",
  read: "Lire",
  drink: "Boire",
  "every-day": "Tous les jours",
  like: "Dire ce que l’on aime",
  coffee: "Un café",
  drinks: "Les boissons",
  order: "Passer commande",
  water: "Water · Eau",
  tea: "Tea · Thé",
  "would-like": "Je voudrais",
  bread: "Bread · Pain",
  food: "Les aliments",
  menu: "Demander le menu",
  chicken: "Chicken · Poulet",
  vegetarian: "Manger végétarien",
  bill: "Demander l’addition",
  payment: "Le paiement",
  "how-much": "Demander le prix",
  card: "Payer par carte",
  price: "Comprendre un prix",
  delicious: "Complimenter un plat",
  station: "La gare",
  travel: "Les transports",
  ticket: "Un billet",
  airport: "L’aéroport",
  bus: "Le bus",
  "ticket-two": "Demander deux billets",
  left: "Tourner à gauche",
  directions: "Les directions",
  "where-hotel": "Trouver l’hôtel",
  right: "Tourner à droite",
  "excuse-me": "Attirer l’attention",
  straight: "Aller tout droit",
  near: "Près de",
  reservation: "Une réservation",
  hotel: "À l’hôtel",
  help: "Demander de l’aide",
  understand: "Dire que l’on ne comprend pas",
  repeat: "Demander de répéter",
};
export function conceptLabel(concept: string) {
  if (/^(es|de):lexique:/.test(concept))
    return `Vocabulaire · séance ${concept.split(":")[2]}`;
  if (/^(es|de):grammaire:/.test(concept))
    return `Grammaire · séance ${concept.split(":")[2]}`;
  if (/^(es|de):/.test(concept)) return concept.slice(3);
  return conceptNames[concept] ?? concept.replaceAll("-", " ");
}

export function Profile() {
  const { course, lessons, language } = useCurriculum();
  const {
    state,
    setState,
    changePreferences,
    openAuth,
    openOnboarding,
    navigate,
    reportError,
  } = useApp();
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const badges = [
    {
      title: "Le premier pas",
      description: "Terminer une première leçon",
      Icon: FlagIcon,
      earned: state.completed.length >= 1,
      color: "peach",
    },
    {
      title: "Sans faute",
      description: "Réussir tous les exercices d’une leçon",
      Icon: Sparkles,
      earned: state.history.some((r) => !r.review && r.correct === r.total),
      color: "yellow",
    },
    {
      title: "L’étincelle",
      description: "Pratiquer trois jours de suite",
      Icon: Flame,
      earned: state.stats.streak >= 3,
      color: "pink",
    },
    {
      title: "En chemin",
      description: "Terminer une unité complète",
      Icon: Trophy,
      earned: course.some((u) =>
        u.lessons.every((l) => state.completed.includes(l.id)),
      ),
      color: "green",
    },
  ];
  async function logout() {
    setSaving(true);
    try {
      setState(await api<AppState>("/auth/logout", "POST", {}));
    } catch (e) {
      reportError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function deleteAccount() {
    setSaving(true);
    setDeleteError("");
    try {
      setState(await api<AppState>("/account", "DELETE", { password }));
      setDeleting(false);
      setPassword("");
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  async function exportProgress() {
    setSaving(true);
    try {
      const data = await api("/account/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ma-progression-parlio.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      reportError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow small">À VOTRE IMAGE, À VOTRE RYTHME</div>
          <h1>
            Votre petit espace<span className="coral-text">.</span>
          </h1>
          <p>Le chemin déjà parcouru, et vos envies pour la suite.</p>
        </div>
      </div>
      <section className="profile-banner card">
        <div className="profile-avatar">
          {state.user.guest ? <Fox /> : state.user.name[0].toUpperCase()}
        </div>
        <div>
          <h2>
            {state.user.guest ? "Un explorateur en herbe" : state.user.name}
          </h2>
          <p>
            {state.user.guest
              ? "Mode découverte · Votre essai est enregistré sur cet appareil."
              : state.user.email}
          </p>
          <span className="profile-level">
            {language.name} débutant · {state.completed.length} leçon
            {state.completed.length > 1 ? "s" : ""} terminée
            {state.completed.length > 1 ? "s" : ""}
          </span>
        </div>
        {state.user.guest && (
          <button className="button primary" onClick={() => openAuth()}>
            Créer mon compte
            <ArrowRight size={17} />
          </button>
        )}
      </section>
      <section className="profile-subscription card">
        <div>
          <h2>
            {state.billing.membership.premium
              ? state.billing.mode === "test"
                ? "Votre Premium de test"
                : "Votre abonnement Premium"
              : "Votre formule gratuite"}
          </h2>
          <p>
            {state.billing.membership.premium
              ? "Retrouvez votre bilan, l’atelier IA et la gestion de votre abonnement."
              : "Les trois langues, les leçons et les révisions restent gratuites. Découvrez Premium pour aller plus loin."}
          </p>
        </div>
        <div>
          <button
            className="button secondary"
            onClick={() =>
              navigate(
                state.billing.membership.premium ? "insights" : "premium",
              )
            }
          >
            {state.billing.membership.premium
              ? "Voir mon bilan"
              : "Découvrir Premium"}
            <ArrowRight size={16} />
          </button>
          <SubscriptionManager />
        </div>
      </section>
      <div className="profile-stats">
        <div>
          <Zap className="gold-text" />
          <strong>{state.stats.xp}</strong>
          <span>points d’expérience</span>
        </div>
        <div>
          <CalendarDays className="green-text" />
          <strong>{state.stats.learningDays}</strong>
          <span>jours de pratique</span>
        </div>
        <div>
          <Target className="coral-text" />
          <strong>
            {state.stats.totalAnswers ? `${state.stats.accuracy} %` : "—"}
          </strong>
          <span>de bonnes réponses</span>
        </div>
        <div>
          <BookOpen className="blue-text" />
          <strong>{state.completed.length} / 18</strong>
          <span>leçons terminées</span>
        </div>
      </div>
      <div className="section-heading">
        <h2>Vos petites victoires</h2>
        <span className="muted">
          {badges.filter((b) => b.earned).length} / {badges.length} badges
        </span>
      </div>
      <div className="badges">
        {badges.map(({ title, description, Icon, earned, color }) => (
          <div
            className={`badge-card card ${earned ? "earned" : ""}`}
            key={title}
          >
            <span className={`badge-medal ${color}`}>
              <Icon size={29} />
              {!earned && <LockKeyhole size={13} className="badge-lock" />}
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
            <span className="badge-state">
              {earned ? "Bien mérité !" : "À votre portée"}
            </span>
          </div>
        ))}
      </div>
      <div className="profile-columns">
        <section className="settings-card card">
          <h2>Votre façon d’apprendre</h2>
          <div className="setting-row">
            <span className="setting-icon">
              <Target size={21} />
            </span>
            <div>
              <h3>Objectif quotidien</h3>
              <p>
                {state.preferences.dailyMinutes} minutes par jour ·{" "}
                {state.preferences.goal === "travel"
                  ? "Voyage"
                  : state.preferences.goal === "work"
                    ? "Travail"
                    : "Vie quotidienne"}
              </p>
            </div>
            <button className="text-button" onClick={openOnboarding}>
              Modifier
            </button>
          </div>
          <div className="setting-row">
            <span className="setting-icon">
              <Volume2 size={21} />
            </span>
            <div>
              <h3>Audio et sons</h3>
              <p>Lecture dans la langue apprise, à votre demande</p>
            </div>
            <button
              className={`toggle ${state.preferences.sound ? "on" : ""}`}
              role="switch"
              aria-checked={state.preferences.sound}
              aria-label="Activer l’audio"
              onClick={() =>
                void changePreferences({ sound: !state.preferences.sound })
              }
            >
              <span />
            </button>
          </div>
          <div className="setting-row">
            <span className="setting-icon">
              <Accessibility size={21} />
            </span>
            <div>
              <h3>Limiter les animations</h3>
              <p>Pour une expérience plus calme</p>
            </div>
            <button
              className={`toggle ${state.preferences.reducedMotion ? "on" : ""}`}
              role="switch"
              aria-checked={state.preferences.reducedMotion}
              aria-label="Limiter les animations"
              onClick={() =>
                void changePreferences({
                  reducedMotion: !state.preferences.reducedMotion,
                })
              }
            >
              <span />
            </button>
          </div>
          <div className="timezone-setting">
            <label htmlFor="timezone">
              Fuseau horaire des objectifs et de la série
            </label>
            <select
              id="timezone"
              value={state.preferences.timezone}
              onChange={(e) =>
                void changePreferences({ timezone: e.target.value })
              }
            >
              {[
                ...new Set([
                  state.preferences.timezone,
                  "Europe/Paris",
                  "Europe/London",
                  "Europe/Brussels",
                  "Europe/Zurich",
                  "America/Montreal",
                  "America/New_York",
                  "America/Guadeloupe",
                  "Indian/Reunion",
                  "Africa/Dakar",
                  "Africa/Abidjan",
                  "Africa/Casablanca",
                  "Asia/Tokyo",
                  "Pacific/Noumea",
                  "UTC",
                ]),
              ].map((zone) => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
            <p>
              Les minutes correspondent à une durée indicative par leçon
              terminée.
            </p>
          </div>
        </section>
        <section className="settings-card card account-settings">
          <h2>Votre compte, vos données</h2>
          <div className="privacy-note">
            <ShieldCheck size={25} />
            <p>
              {state.user.guest
                ? "Créez un compte pour retrouver votre progression sur un autre appareil. Votre essai sera conservé."
                : "Vos leçons et vos révisions sont sauvegardées dans votre compte."}
            </p>
          </div>
          {state.user.guest ? (
            <>
              <button className="button primary" onClick={() => openAuth()}>
                Créer un compte gratuit
                <ArrowUpRight size={16} />
              </button>
              <button className="text-button" onClick={() => openAuth("login")}>
                J’ai déjà un compte
              </button>
            </>
          ) : (
            <button
              disabled={saving}
              className="button secondary"
              onClick={() => void logout()}
            >
              <LogOut size={17} />
              Se déconnecter
            </button>
          )}
          <button
            className="text-button account-action"
            onClick={exportProgress}
          >
            <Download size={16} />
            Exporter ma progression
          </button>
          <button
            className="text-button danger account-action"
            onClick={() => setDeleting(true)}
          >
            <Trash2 size={16} />
            {state.user.guest ? "Effacer mon essai" : "Supprimer mon compte"}
          </button>
        </section>
      </div>
      {deleting && (
        <Modal
          title={
            state.user.guest
              ? "Effacer votre essai ?"
              : "Supprimer votre compte ?"
          }
          onClose={() => {
            if (!saving) {
              setDeleting(false);
              setDeleteError("");
            }
          }}
        >
          <p className="modal-description">
            Votre progression, vos réponses, vos réglages et{" "}
            {state.user.guest ? "votre session d’essai" : "votre compte"} seront
            définitivement supprimés.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void deleteAccount();
            }}
          >
            {!state.user.guest && (
              <label className="field">
                Confirmez avec votre mot de passe
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
            )}
            {deleteError && (
              <p className="form-error" role="alert">
                {deleteError}
              </p>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                disabled={saving}
                onClick={() => setDeleting(false)}
              >
                Garder ma progression
              </button>
              <button className="button destructive" disabled={saving}>
                {saving ? "Suppression…" : "Supprimer définitivement"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
const FlagIcon = BookOpen;
