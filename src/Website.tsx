import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Globe2,
  MoveUpRight,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { courses, getCourse } from "../shared/courses";
import { grade } from "../shared/learning";
import { premiumPlans } from "../shared/billing";
import type { CourseId } from "../shared/types";
import { useApp } from "./context";
import { Brand, Modal } from "./ui";

export default function Website() {
  const { state, changePreferences, navigate, openAuth } = useApp();
  const [selected, setSelected] = useState<CourseId>(
    state.preferences.courseId,
  );
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const language = getCourse(selected);
  const sample = language.units[0].lessons[0].exercises[0];
  const correct = checked && grade(sample, answer);
  async function start(id = selected) {
    setBusy(true);
    const saved = await changePreferences({ courseId: id });
    setBusy(false);
    if (saved) navigate("today");
  }
  function choose(id: CourseId) {
    setSelected(id);
    setAnswer("");
    setChecked(false);
  }
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({
      behavior: state.preferences.reducedMotion ? "instant" : "smooth",
    });
  return (
    <div className="website">
      <header className="site-header">
        <a href="#welcome" className="site-brand" aria-label="Parlio, accueil">
          <Brand />
        </a>
        <nav aria-label="Découvrir Parlio">
          <button onClick={() => scrollTo("site-languages")}>
            Les langues
          </button>
          <button onClick={() => scrollTo("site-method")}>La méthode</button>
          <button onClick={() => scrollTo("site-pricing")}>Les formules</button>
        </nav>
        <div className="site-header-actions">
          <button
            className="site-login"
            onClick={() =>
              state.user.guest ? openAuth("login") : navigate("today")
            }
          >
            {state.user.guest ? "Se connecter" : "Mon espace"}
          </button>
          <button
            className="site-button dark small"
            onClick={() => void start()}
            disabled={busy}
          >
            Commencer <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="site-hero">
          <div className="site-hero-copy">
            <div className="editorial-eyebrow">
              <span /> LES LANGUES OUVRENT LE MONDE
            </div>
            <h1>
              De nouveaux mots.
              <br />
              <em>
                De nouveaux
                <br className="desktop-break" /> horizons.
              </em>
            </h1>
            <p>
              L’anglais, l’espagnol ou l’allemand. Quelques minutes par jour. Et
              le plaisir de trouver vos mots, simplement.
            </p>
            <div className="site-hero-actions">
              <button
                className="site-button dark"
                disabled={busy}
                onClick={() => void start()}
              >
                Commencer gratuitement <ArrowUpRight size={18} />
              </button>
              <span>
                Sans carte bancaire.
                <br />À votre rythme.
              </span>
            </div>
            <button
              className="site-discover"
              onClick={() => scrollTo("site-languages")}
            >
              <span>01 — CHOISIR SA PROCHAINE DESTINATION</span>
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="site-hero-visual">
            <div className="hero-orbit" aria-hidden="true">
              <Globe2 />
              <span>
                LE MONDE COMMENCE
                <br />
                PAR UNE RENCONTRE.
              </span>
            </div>
            <div className="practice-paper">
              <div className="paper-top">
                <span>VOTRE PREMIER PAS</span>
                <span>01 / 08</span>
              </div>
              <div
                className="sample-language"
                role="group"
                aria-label="Langue de l’aperçu"
              >
                {courses.map((course) => (
                  <button
                    key={course.id}
                    aria-pressed={selected === course.id}
                    onClick={() => choose(course.id)}
                  >
                    <span aria-hidden="true">{course.flag}</span>
                    {course.name}
                  </button>
                ))}
              </div>
              <span className="paper-caption">Comment dit-on…</span>
              <p className="sample-word" lang={language.id}>
                {sample.prompt}
                <span>?</span>
              </p>
              <div
                className="sample-answers"
                role="group"
                aria-label="Traduction dans cet aperçu"
              >
                {sample.options!.map((option, i) => (
                  <button
                    key={option}
                    disabled={checked}
                    aria-pressed={answer === option}
                    className={`${answer === option ? "selected" : ""} ${checked && option === sample.answers[0] ? "correct" : ""}`}
                    onClick={() => setAnswer(option)}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {option}
                    {checked && option === sample.answers[0] ? (
                      <Check size={15} />
                    ) : (
                      <span className="answer-circle" />
                    )}
                  </button>
                ))}
              </div>
              {checked ? (
                <div className="sample-feedback" role="status">
                  <strong>
                    {correct
                      ? "Le début d’une conversation."
                      : `Le mot juste : ${sample.answers[0]}.`}
                  </strong>
                  <p>{sample.explanation}</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setChecked(false);
                      setAnswer("");
                    }}
                  >
                    Recommencer <RotateCcw size={14} />
                  </button>
                </div>
              ) : (
                <button
                  className="site-button dark sample-verify"
                  disabled={!answer}
                  onClick={() => setChecked(true)}
                >
                  Vérifier <ArrowRight size={17} />
                </button>
              )}
              <p className="paper-note">
                Un aperçu, sans inscription. Les progrès commencent dans votre
                espace.
              </p>
            </div>
            <div className="visual-caption">
              <span>FRANÇAIS → {language.name.toUpperCase()}</span>
              <span>LE PLAISIR D’APPRENDRE, RETROUVÉ.</span>
            </div>
          </div>
        </section>
        <div className="site-proof">
          <p>Un apprentissage qui trouve sa place dans votre quotidien.</p>
          <span>
            <BookOpen size={17} /> 18 leçons par langue
          </span>
          <span>
            <RotateCcw size={17} /> Révisions espacées
          </span>
          <span>
            <Globe2 size={17} /> Conçu pour les francophones
          </span>
        </div>
        <section id="site-languages" className="site-section languages-section">
          <div className="section-editorial">
            <span className="editorial-eyebrow">01 / LES LANGUES</span>
            <h2>
              Où votre curiosité
              <br />
              <em>vous emmène-t-elle ?</em>
            </h2>
            <p>
              Trois parcours pour commencer. Changez de langue quand vous le
              souhaitez : vos acquis vous suivent.
            </p>
          </div>
          <div className="site-language-grid">
            {courses.map((course, index) => (
              <article
                className={`site-language-card language-${course.id}`}
                key={course.id}
              >
                <div className="language-card-top">
                  <span>PARCOURS {String(index + 1).padStart(2, "0")}</span>
                  <span aria-hidden="true">{course.flag}</span>
                </div>
                <div className="language-greeting" lang={course.id}>
                  {course.id === "de"
                    ? "Hallo."
                    : course.id === "en"
                      ? "Hello."
                      : "Hola."}
                </div>
                <div className="language-card-bottom">
                  <div>
                    <h3>{course.name}</h3>
                    <p>Débutant · 6 unités · 144 exercices</p>
                  </div>
                  <button
                    onClick={() => void start(course.id)}
                    disabled={busy}
                    aria-label={`Apprendre l’${course.name.toLowerCase()}`}
                  >
                    <MoveUpRight size={23} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="site-method" className="site-section method-section">
          <div className="section-editorial">
            <span className="editorial-eyebrow">02 / LA MÉTHODE</span>
            <h2>
              Moins de pression.
              <br />
              <em>Plus de conversation.</em>
            </h2>
            <p>
              Une progression claire, des exercices variés, et le droit de se
              tromper.
            </p>
          </div>
          <div className="method-grid">
            {[
              [
                "01",
                "Un rendez-vous accessible.",
                "Choisissez cinq, dix ou quinze minutes par jour. Une leçon courte vous aide à garder le fil.",
              ],
              [
                "02",
                "Des mots qui reviennent.",
                "Vos erreurs et vos réussites déterminent quand revoir une notion. La mémoire se construit dans le temps.",
              ],
              [
                "03",
                "Des progrès qui vous appartiennent.",
                "Retrouvez vos leçons et vos révisions dans chaque langue. Un compte gratuit conserve vos acquis d’un appareil à l’autre.",
              ],
            ].map(([number, title, description]) => (
              <article key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="site-ai-section">
          <div className="ai-editorial-art" aria-hidden="true">
            <span>
              Un mot.
              <br />
              <em>Une question.</em>
              <br />
              Un échange.
            </span>
            <Sparkles size={32} />
          </div>
          <div>
            <span className="editorial-eyebrow">03 / L’ATELIER IA</span>
            <h2>
              Un accompagnement
              <br />
              <em>plus personnel.</em>
            </h2>
            <p>
              Un tuteur pour pratiquer vos échanges et une séance de quatre
              exercices adaptée aux notions travaillées. Vous gardez la main, à
              chaque étape.
            </p>
            <span className="availability-label">
              <span />
              {state.ai.configured
                ? "IA configurée · accès Premium"
                : "En préparation · activation nécessaire"}
            </span>
            <p className="ai-site-note">
              L’IA est une aide de pratique : elle peut se tromper. Son
              utilisation est facultative et soumise à un quota quotidien.
            </p>
            <button
              className="site-text-link"
              onClick={() => navigate("tutor")}
            >
              Découvrir l’atelier <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <section id="site-pricing" className="site-section pricing-section">
          <div className="section-editorial">
            <span className="editorial-eyebrow">04 / LES FORMULES</span>
            <h2>
              Commencez librement.
              <br />
              <em>Allez à votre rythme.</em>
            </h2>
            <p>
              L’apprentissage essentiel reste gratuit. Premium apporte un bilan
              détaillé et, lorsqu’il est activé, un atelier IA.
            </p>
          </div>
          <div className="site-pricing-grid">
            <article>
              <span className="editorial-eyebrow">L’ESSENTIEL</span>
              <h3>Parlio</h3>
              <p className="site-price">Gratuit</p>
              <p>Pour faire des langues une habitude.</p>
              <ul>
                <li>
                  <Check size={16} /> Anglais, espagnol et allemand débutant
                </li>
                <li>
                  <Check size={16} /> 54 leçons et les révisions espacées
                </li>
                <li>
                  <Check size={16} /> Compte et sauvegarde des progrès
                </li>
              </ul>
              <button
                className="site-button outline"
                onClick={() => void start()}
                disabled={busy}
              >
                C’est parti <ArrowUpRight size={17} />
              </button>
            </article>
            <article className="plus">
              <span className="editorial-eyebrow">L’ACCOMPAGNEMENT</span>
              <h3>
                Parlio Premium <Sparkles size={22} />
              </h3>
              <p className="site-price">
                {premiumPlans.monthly.price}
                <small> / mois</small>
              </p>
              <p>Un regard plus précis sur votre progression.</p>
              <ul>
                <li>
                  <Check size={16} /> Tout l’essentiel de Parlio
                </li>
                <li>
                  <Check size={16} /> Statistiques par unité et sur 30 jours
                </li>
                <li>
                  <Check size={16} /> Atelier IA lorsqu’il est activé
                </li>
              </ul>
              <button
                className="site-button dark"
                onClick={() => navigate("premium")}
              >
                Découvrir Premium <ArrowUpRight size={17} />
              </button>
              <p className="pricing-disclaimer">
                Ou {premiumPlans.yearly.price}/an.{" "}
                {state.billing.configured
                  ? state.billing.mode === "test"
                    ? "Paiement de test uniquement."
                    : "Renouvellement automatique. Résiliation depuis votre profil."
                  : "Abonnement non commercialisé."}
              </p>
            </article>
          </div>
        </section>
        <section className="site-final-cta">
          <span className="editorial-eyebrow">LE PROCHAIN MOT VOUS ATTEND</span>
          <h2>
            Le monde a tant
            <br />
            <em>à vous dire.</em>
          </h2>
          <button
            className="site-button light"
            onClick={() => void start()}
            disabled={busy}
          >
            Commençons par bonjour <ArrowUpRight size={18} />
          </button>
        </section>
      </main>
      <footer className="site-footer">
        <div>
          <Brand />
          <p>Un petit pas. Un nouveau monde.</p>
        </div>
        <div>
          <span>APPRENDRE, SIMPLEMENT.</span>
          <button onClick={() => navigate("today")}>
            Mon espace <ArrowUpRight size={14} />
          </button>
          <button onClick={() => setPrivacy(true)}>
            Données et confidentialité
          </button>
        </div>
        <p>
          © {new Date().getFullYear()} Parlio · Contenu d’initiation, sans
          certification de niveau.
        </p>
      </footer>
      {privacy && (
        <Modal title="Vos données, en clair" onClose={() => setPrivacy(false)}>
          <div className="privacy-copy">
            <p>
              Parlio enregistre vos préférences, vos leçons et vos révisions
              dans sa base de données. Un cookie de session permet de retrouver
              votre espace. Un compte ajoute votre prénom, votre adresse e-mail
              et un mot de passe stocké sous forme dérivée.
            </p>
            <p>
              Si vous utilisez l’atelier IA, les messages de la conversation
              récente et les notions nécessaires à l’exercice sont transmis à
              OpenAI. N’y saisissez pas de données sensibles. L’audio utilise la
              synthèse vocale de votre appareil, à votre demande.
            </p>
            <p>
              Les paiements sont traités par Stripe ; Parlio ne reçoit pas les
              numéros de carte. Vous pouvez effacer la conversation IA ou
              supprimer votre compte et vos données depuis votre espace.
            </p>
            <button
              className="button primary"
              onClick={() => setPrivacy(false)}
            >
              J’ai compris
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
