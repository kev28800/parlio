import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Clock3, LockKeyhole, Zap } from "lucide-react";
import type { PremiumStats } from "../shared/ai";
import { useApp } from "./context";
import { useCurriculum } from "./curriculum";
import { api } from "./api";
import { Spinner } from "./ui";

export default function Insights() {
  const { state, navigate, openAuth } = useApp();
  const { language } = useCurriculum();
  const [stats, setStats] = useState<PremiumStats | null>(null);
  const [selected, setSelected] = useState(29);
  const [error, setError] = useState("");
  const premium = state.billing.membership.premium && !state.user.guest;
  useEffect(() => {
    if (!premium) return;
    let current = true;
    setStats(null);
    setError("");
    api<PremiumStats>("/premium/stats")
      .then((data) => {
        if (current) setStats(data);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [premium, language.id]);
  return (
    <div className="insights-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow small">
            VOTRE BILAN · {language.name.toUpperCase()}
          </span>
          <h1>
            Le chemin parcouru<span className="coral-text">.</span>
          </h1>
          <p>Vos vraies données, pour comprendre votre rythme.</p>
        </div>
        <span className="level-tag">
          <BarChart3 size={16} /> Premium
        </span>
      </div>
      {!premium ? (
        <section className="atelier-gate card">
          <LockKeyhole size={26} />
          <h2>Un regard plus précis.</h2>
          <p>
            Retrouvez votre activité sur 30 jours et votre taux de réussite dans
            chaque unité avec Premium.
          </p>
          <button
            className="button primary"
            onClick={() =>
              state.user.guest ? openAuth() : navigate("premium")
            }
          >
            {state.user.guest
              ? "Créer mon compte gratuit"
              : "Découvrir Premium"}
            <ArrowRight size={17} />
          </button>
        </section>
      ) : error ? (
        <p role="alert" className="form-error">
          {error}
        </p>
      ) : !stats ? (
        <Spinner label="Préparation de votre bilan…" />
      ) : (
        <>
          <section className="insights-chart card">
            <div className="card-heading">
              <h2>Les 30 derniers jours</h2>
              <span>Fuseau : {state.preferences.timezone}</span>
            </div>
            <p>
              Activité en {language.name.toLowerCase()}, leçons, révisions et
              pratique IA terminées.
            </p>
            <div
              className="activity-bars"
              role="group"
              aria-label="Choisir un jour pour voir son activité"
            >
              {stats.days.map((day, i) => (
                <button
                  key={day.date}
                  aria-pressed={selected === i}
                  aria-label={`${day.date} : ${day.minutes} minutes, ${day.xp} XP`}
                  onClick={() => setSelected(i)}
                >
                  <span
                    style={{
                      height: `${Math.max(3, (day.minutes / Math.max(1, ...stats.days.map((d) => d.minutes))) * 100)}%`,
                    }}
                  />
                </button>
              ))}
            </div>
            <div className="activity-detail" role="status">
              <strong>
                {new Intl.DateTimeFormat("fr", {
                  day: "numeric",
                  month: "long",
                  timeZone: "UTC",
                }).format(new Date(`${stats.days[selected].date}T12:00:00Z`))}
              </strong>
              <span>
                <Clock3 size={16} />
                {stats.days[selected].minutes} min
              </span>
              <span>
                <Zap size={16} />
                {stats.days[selected].xp} XP
              </span>
            </div>
          </section>
          <section className="insights-units card">
            <h2>Vos réussites par unité</h2>
            <p>
              Calculées sur les réponses aux leçons et révisions du parcours. La
              pratique générée par IA est séparée.
            </p>
            {stats.units.map((unit, index) => (
              <div className="insights-unit" key={unit.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{unit.title}</h3>
                  <p>
                    {unit.answered
                      ? `${unit.answered} réponse${unit.answered > 1 ? "s" : ""}`
                      : "Pas encore pratiquée"}
                  </p>
                </div>
                <strong>
                  {unit.accuracy === null ? "—" : `${unit.accuracy} %`}
                </strong>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
