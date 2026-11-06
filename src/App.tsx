import { useEffect, useRef, useState } from "react";
import {
  Route,
  RotateCcw,
  UserRound,
  Sparkles,
  ArrowUpRight,
  Flame,
  Zap,
  ChevronDown,
  CircleHelp,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Leaf,
  MessageCircle,
  BarChart3,
  Gamepad2,
  Map,
  Trophy,
} from "lucide-react";
import { courses, getCourse } from "../shared/courses";
import type { AppState, Preferences, RunView } from "../shared/types";
import { api } from "./api";
import { AppContext } from "./context";
import { Brand, Fox, Modal, Spinner } from "./ui";
import Dashboard from "./Dashboard";
import { Path, Profile, Review } from "./Views";
import { Auth, Onboarding } from "./Account";
import { Premium, PremiumContent } from "./Premium";
import Website from "./Website";
import Tutor from "./Tutor";
import Insights from "./Insights";
import Lesson from "./Lesson";

const tabs = [
  {
    id: "today",
    label: "Aujourd’hui",
    caption: "Camp de base",
    Icon: Gamepad2,
    tone: "purple",
  },
  {
    id: "path",
    label: "Mon parcours",
    caption: "Carte de l’aventure",
    Icon: Map,
    tone: "blue",
  },
  {
    id: "review",
    label: "Mes révisions",
    caption: "Entraînement",
    Icon: RotateCcw,
    tone: "mint",
  },
  {
    id: "tutor",
    label: "Pip à l’oral",
    caption: "Voix et conversation IA",
    Icon: MessageCircle,
    tone: "pink",
  },
  {
    id: "insights",
    label: "Mon bilan",
    caption: "Tableau de progression",
    Icon: BarChart3,
    tone: "orange",
  },
  {
    id: "profile",
    label: "Mon profil",
    caption: "Badges et réglages",
    Icon: Trophy,
    tone: "yellow",
  },
];
const readPage = () => window.location.hash.slice(1).split("?")[0] || "welcome";
export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [page, setPage] = useState(readPage);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [auth, setAuth] = useState<"register" | "login" | null>(null);
  const [premium, setPremium] = useState(false);
  const [help, setHelp] = useState(false);
  const [language, setLanguage] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mobileNavigation, setMobileNavigation] = useState(
    () => window.matchMedia("(max-width: 760px)").matches,
  );
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeMenuRef = useRef<HTMLButtonElement>(null);
  const onboardingDismissed = useRef(new Set<string>());
  async function load() {
    setLoadError("");
    try {
      setState(await api<AppState>("/state"));
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const changed = () => {
      setMobileNavigation(query.matches);
      if (!query.matches) setMenu(false);
    };
    query.addEventListener("change", changed);
    return () => query.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (!menu || !mobileNavigation) return;
    closeMenuRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closePlayerMenu();
      }
      if (event.key === "Tab") {
        const nodes = [
          ...document.querySelectorAll<HTMLElement>(
            "#player-menu a[href], #player-menu button:not(:disabled)",
          ),
        ].filter((node) => node.getClientRects().length > 0);
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [menu, mobileNavigation]);
  useEffect(() => {
    void load();
    const listener = () => {
      setPage(readPage());
      setMenu(false);
      window.scrollTo({ top: 0, behavior: "instant" });
      requestAnimationFrame(() =>
        document.getElementById("main")?.focus({ preventScroll: true }),
      );
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (
      state &&
      ["today", "path", "review"].includes(page) &&
      !state.preferences.onboarded &&
      !onboardingDismissed.current.has(state.user.id)
    )
      setOnboarding(true);
  }, [state?.user.id, state?.preferences.onboarded, page]);
  useEffect(() => {
    document.documentElement.dataset.reducedMotion = String(
      state?.preferences.reducedMotion ?? false,
    );
  }, [state?.preferences.reducedMotion]);
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 9000);
    return () => clearTimeout(timer);
  }, [error]);
  function navigate(destination: string) {
    window.location.hash = destination;
    setMenu(false);
  }
  function closePlayerMenu() {
    setMenu(false);
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }
  async function startLesson(id: string) {
    setBusy(true);
    try {
      const run = await api<RunView>("/runs", "POST", { lessonId: id });
      navigate(`lesson/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function startReview() {
    setBusy(true);
    try {
      const run = await api<RunView>("/runs", "POST", { mode: "review" });
      navigate(`lesson/${run.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function changePreferences(changes: Partial<Preferences>) {
    try {
      setState(await api<AppState>("/preferences", "PATCH", changes));
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function closeOnboarding() {
    if (state) onboardingDismissed.current.add(state.user.id);
    setOnboarding(false);
  }
  if (!state)
    return (
      <div className="app-loading">
        <Brand />
        {loadError ? (
          <div className="load-error">
            <h1>On se reconnecte ?</h1>
            <p role="alert">{loadError}</p>
            <button className="button primary" onClick={() => void load()}>
              Réessayer
              <RotateCcw size={17} />
            </button>
          </div>
        ) : (
          <Spinner label="Un nouveau monde se prépare…" />
        )}
      </div>
    );
  const inLesson = page.startsWith("lesson/");
  const selectedCourse = getCourse(state.preferences.courseId);
  return (
    <AppContext.Provider
      value={{
        state,
        setState,
        navigate,
        startLesson,
        startReview,
        changePreferences,
        openAuth: (mode = "register") => setAuth(mode),
        openOnboarding: () => setOnboarding(true),
        busy,
        reportError: setError,
      }}
    >
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Aller au contenu
      </a>
      {page === "welcome" ? (
        <Website />
      ) : (
        <div className="app-shell">
          <aside
            id="player-menu"
            inert={mobileNavigation && !menu}
            className={`sidebar ${menu ? "open" : ""}`}
          >
            <button
              className="logo-button"
              onClick={() => navigate("welcome")}
              aria-label="Parlio, accueil"
            >
              <Brand />
            </button>
            <span className="brand-caption">
              LA LANGUE EST VOTRE TERRAIN DE JEU.
            </span>
            <button
              className="icon-button sidebar-close"
              ref={closeMenuRef}
              aria-label="Fermer le menu"
              onClick={closePlayerMenu}
            >
              <X />
            </button>
            <div className="nav-eyebrow">MENU DU JOUEUR</div>
            <nav aria-label="Navigation principale">
              {tabs.map(({ id, label, caption, Icon, tone }) => (
                <a
                  href={`#${id}`}
                  key={id}
                  className={`nav-item nav-${tone} ${page === id || (inLesson && id === "today") ? "active" : ""}`}
                  aria-label={label}
                  aria-current={page === id ? "page" : undefined}
                  onClick={() => setMenu(false)}
                >
                  <span className="nav-game-icon">
                    <Icon size={21} strokeWidth={1.8} />
                  </span>
                  <span className="nav-game-text">
                    <strong>{label}</strong>
                    <small>{caption}</small>
                  </span>
                  {id === "review" && state.review.due > 0 && (
                    <span className="nav-count">{state.review.due}</span>
                  )}
                </a>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <div className="sidebar-premium">
                <span className="premium-icon">
                  <Sparkles size={22} />
                </span>
                <span className="eyebrow small">
                  ET SI ON ALLAIT PLUS LOIN ?
                </span>
                <h3>
                  La curiosité
                  <br />
                  n’a pas de limites.
                </h3>
                <p>
                  Votre bilan et un atelier
                  <br />
                  pour pratiquer avec l’IA.
                </p>
                <button onClick={() => setPremium(true)}>
                  Parlio Premium
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <button className="help-button" onClick={() => setHelp(true)}>
                <CircleHelp size={18} />
                <span>Un petit coup de pouce ?</span>
                <ArrowUpRight size={14} />
              </button>
              <span className="sidebar-copyright">
                Fait pour apprendre. À votre rythme.
              </span>
            </div>
          </aside>
          {menu && (
            <button
              className="menu-backdrop"
              aria-label="Fermer le menu"
              onClick={closePlayerMenu}
            />
          )}
          <div className="main-shell">
            <header className="topbar">
              <div className="topbar-left">
                <button
                  className="icon-button mobile-menu"
                  ref={menuButtonRef}
                  onClick={() => setMenu(true)}
                  aria-label="Ouvrir le menu"
                  aria-expanded={menu}
                  aria-controls="player-menu"
                >
                  <Menu size={23} />
                </button>
                <span className="topbar-message">
                  <Gamepad2 size={16} /> L’aventure continue
                  <span className="coral-text">.</span>
                </span>
                <span className="mobile-brand">
                  <Brand small />
                </span>
              </div>
              <div className="topbar-actions">
                <button
                  className="language-button"
                  onClick={() => setLanguage(true)}
                  aria-label={`Langue apprise : ${selectedCourse.name.toLowerCase()}`}
                >
                  <span className="uk-flag" aria-hidden="true">
                    {selectedCourse.flag}
                  </span>
                  <span>{selectedCourse.name}</span>
                  <ChevronDown size={14} />
                </button>
                <span className="topbar-divider" />
                <button
                  className="header-stat streak-stat"
                  onClick={() => navigate("profile")}
                  aria-label={`${state.stats.streak} jours de série`}
                >
                  <Flame size={20} fill="#f5d6bc" />
                  <strong>{state.stats.streak}</strong>
                </button>
                <button
                  className="header-stat xp-stat"
                  onClick={() => navigate("profile")}
                  aria-label={`${state.stats.xp} points d’expérience`}
                >
                  <Zap size={20} fill="#f4d16f" />
                  <strong>
                    {state.stats.xp}
                    <span> XP</span>
                  </strong>
                </button>
                <button
                  className="header-avatar"
                  onClick={() => navigate("profile")}
                  aria-label="Ouvrir mon profil"
                >
                  {state.user.guest ? (
                    <UserRound size={20} />
                  ) : (
                    state.user.name[0].toUpperCase()
                  )}
                </button>
              </div>
            </header>
            <main
              id="main"
              tabIndex={-1}
              className={`main-content ${inLesson ? "in-lesson" : ""}`}
            >
              {inLesson ? (
                <Lesson id={page.slice(7)} />
              ) : page === "path" ? (
                <Path />
              ) : page === "review" ? (
                <Review />
              ) : page === "profile" ? (
                <Profile />
              ) : page === "tutor" ? (
                <Tutor key={`${state.user.id}:${state.preferences.courseId}`} />
              ) : page === "insights" ? (
                <Insights
                  key={`${state.user.id}:${state.preferences.courseId}`}
                />
              ) : page === "premium" ? (
                <div className="premium-page card">
                  <h1>Votre abonnement Parlio</h1>
                  <PremiumContent />
                </div>
              ) : page === "today" ? (
                <Dashboard />
              ) : (
                <div className="empty-state card">
                  <Route size={34} />
                  <h1>Un petit détour ?</h1>
                  <p>Cette page n’existe pas. Votre parcours vous attend.</p>
                  <button
                    className="button primary"
                    onClick={() => navigate("today")}
                  >
                    Revenir à l’accueil
                    <ArrowRight size={17} />
                  </button>
                </div>
              )}
            </main>
            <nav className="mobile-nav" aria-label="Navigation mobile">
              {tabs.map(({ id, label, Icon }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  aria-current={page === id ? "page" : undefined}
                  className={page === id ? "active" : ""}
                >
                  <Icon size={21} />
                  <span>{label.replace("Mon ", "").replace("Mes ", "")}</span>
                  {id === "review" && state.review.due > 0 && <i />}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
      {error && (
        <div className="toast" role="alert">
          <CircleHelp size={20} />
          <p>{error}</p>
          <button aria-label="Fermer le message" onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      {onboarding && <Onboarding onClose={closeOnboarding} />}{" "}
      {auth && <Auth initialMode={auth} onClose={() => setAuth(null)} />}{" "}
      {premium && <Premium onClose={() => setPremium(false)} />}
      {language && (
        <Modal
          title="Votre prochaine langue"
          onClose={() => setLanguage(false)}
        >
          <p className="modal-description">
            Chaque langue garde son parcours, vos leçons et vos révisions. Les
            consignes restent en français.
          </p>
          <div className="language-selector">
            {courses.map((course) => {
              const progress = state.courseProgress.find(
                (item) => item.id === course.id,
              )!;
              return (
                <button
                  key={course.id}
                  aria-pressed={state.preferences.courseId === course.id}
                  onClick={() =>
                    void changePreferences({ courseId: course.id }).then(
                      (ok) => {
                        if (ok) {
                          setLanguage(false);
                          if (inLesson) navigate("today");
                        }
                      },
                    )
                  }
                >
                  <span className="big-flag" aria-hidden="true">
                    {course.flag}
                  </span>
                  <span>
                    <strong>{course.name}</strong>
                    <small>
                      Débutant · {progress.completed} / {progress.total} leçons
                    </small>
                  </span>
                  {state.preferences.courseId === course.id ? (
                    <span className="level-tag">En cours</span>
                  ) : (
                    <ArrowRight size={18} />
                  )}
                </button>
              );
            })}
          </div>
          <button
            className="button primary full-width"
            onClick={() => setLanguage(false)}
          >
            Retrouver mon parcours
            <ArrowRight size={18} />
          </button>
        </Modal>
      )}
      {help && (
        <Modal title="Chaque petit pas compte." onClose={() => setHelp(false)}>
          <div className="help-intro">
            <Fox happy />
            <p>Voici comment prendre vos marques avec Parlio.</p>
          </div>
          <div className="help-topics">
            <div>
              <Route size={21} />
              <p>
                <strong>Un parcours progressif</strong>Les leçons se débloquent
                une par une. Une erreur n’empêche jamais de terminer.
              </p>
            </div>
            <div>
              <RotateCcw size={21} />
              <p>
                <strong>Des mots qui reviennent</strong>Votre carnet fait
                revenir les notions fragiles et celles dont la révision est
                arrivée.
              </p>
            </div>
            <div>
              <ShieldCheck size={21} />
              <p>
                <strong>Des progrès à conserver</strong>L’essai reste disponible
                avec le cookie de cet appareil. Un compte gratuit permet de le
                retrouver ailleurs.
              </p>
            </div>
            <div>
              <Leaf size={21} />
              <p>
                <strong>À votre rythme</strong>Réglez votre objectif, votre
                fuseau horaire, l’audio et les animations dans votre profil.
              </p>
            </div>
          </div>
          <p className="fine-print">
            Contenu original d’initiation à faire relire avant
            commercialisation. Aucun niveau officiel ni score de prononciation
            n’est attribué.
          </p>
        </Modal>
      )}
    </AppContext.Provider>
  );
}
