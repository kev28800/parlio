import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  Sparkles,
} from "lucide-react";
import {
  premiumPlans,
  type BillingOverview,
  type BillingPlan,
} from "../shared/billing";
import { useApp } from "./context";
import { api } from "./api";
import { Modal } from "./ui";
import type { AppState } from "../shared/types";

export function PremiumContent({ onClose }: { onClose?: () => void }) {
  const { state, setState, openAuth, navigate } = useApp();
  const [plan, setPlan] = useState<BillingPlan>("yearly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef<{ plan: BillingPlan; id: string } | null>(null);
  const billing = state.billing;
  const testMode = billing.mode === "test";
  useEffect(() => {
    const returning = new URLSearchParams(window.location.hash.split("?")[1]);
    if (returning.get("checkout") === "cancelled")
      setMessage("Le paiement a été annulé. Votre accès gratuit est conservé.");
    if (returning.get("checkout") !== "success" || !billing.configured) return;
    let current = true;
    setBusy(true);
    api<BillingOverview>("/billing/refresh", "POST", {})
      .then(async () => {
        const updated = await api<AppState>("/state");
        if (!current) return;
        setState(updated);
        setMessage(
          updated.billing.membership.premium
            ? testMode
              ? "Votre abonnement de test est confirmé. Aucun argent réel n’a été prélevé."
              : "Votre abonnement Premium est confirmé."
            : "La confirmation Stripe n’est pas encore disponible. Vous pouvez actualiser les droits ci-dessous.",
        );
      })
      .catch((e) => {
        if (current) setError(e.message);
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, []);
  async function checkout() {
    if (state.user.guest) {
      onClose?.();
      openAuth();
      return;
    }
    setBusy(true);
    setError("");
    if (!request.current || request.current.plan !== plan)
      request.current = { plan, id: crypto.randomUUID() };
    try {
      const result = await api<{ url: string }>("/billing/checkout", "POST", {
        plan,
        requestId: request.current.id,
      });
      window.location.assign(result.url);
    } catch (e) {
      request.current = null;
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await api("/billing/refresh", "POST", {});
      setState(await api<AppState>("/state"));
      setMessage("Les droits ont été vérifiés auprès de Stripe.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="premium-content">
      <span className="editorial-eyebrow">
        <Sparkles size={15} /> PARLIO PREMIUM
      </span>
      <h2>
        Un peu plus loin.
        <br />
        <em>À votre rythme.</em>
      </h2>
      <p className="premium-lead">
        Gardez l’essentiel gratuitement. Explorez un accompagnement plus
        personnel avec Premium.
      </p>
      <div className="billing-notice">
        <LockKeyhole size={18} />
        <p>
          <strong>
            {billing.configured
              ? testMode
                ? "Mode test uniquement"
                : "Abonnement avec renouvellement automatique"
              : "Abonnements en préparation"}
          </strong>
          {billing.configured
            ? testMode
              ? "Les paiements utilisent Stripe en mode test. Aucune carte réelle n’est nécessaire."
              : "Le montant affiché est débité à la souscription puis à chaque renouvellement. Résiliez depuis votre profil pour arrêter les prochains paiements ; votre accès reste disponible jusqu’à la fin de la période payée."
            : "Le paiement n’est pas activé. Aucune souscription n’est possible pour le moment."}
        </p>
      </div>
      <ul className="premium-features">
        <li>
          <Check size={17} /> Les trois parcours et les révisions gratuites
        </li>
        <li>
          <Check size={17} /> Le bilan détaillé sur 30 jours et par unité
        </li>
        <li>
          <Check size={17} /> L’atelier IA, lorsqu’il est activé : tuteur et
          séance quotidienne
        </li>
      </ul>
      <p className="fine-print">
        L’atelier IA nécessite une configuration distincte. Il est limité à{" "}
        {state.ai.dailyLimit} demandes par jour UTC, dont une séance de 4
        exercices par langue. Les réponses générées peuvent contenir des
        erreurs.
      </p>
      {billing.membership.premium ? (
        <div className="membership-active">
          <span className="level-tag">
            <Check size={16} />{" "}
            {testMode ? "Premium de test actif" : "Premium actif"}
          </span>
          <p>
            Votre période se termine le{" "}
            {new Intl.DateTimeFormat("fr", { dateStyle: "long" }).format(
              new Date(billing.membership.periodEnd!),
            )}
            .
            {billing.membership.cancelAtPeriodEnd &&
              " Le renouvellement est annulé."}
          </p>
          <button
            className="button primary"
            onClick={() => {
              onClose?.();
              navigate("insights");
            }}
          >
            Voir mon bilan <ArrowRight size={17} />
          </button>
          <SubscriptionManager />
        </div>
      ) : (
        <>
          <fieldset className="plan-choices">
            <legend>
              Choisir une formule{" "}
              {testMode && billing.configured ? "de test" : ""}
            </legend>
            {(
              Object.entries(premiumPlans) as [
                BillingPlan,
                typeof premiumPlans.monthly,
              ][]
            ).map(([id, item]) => (
              <label key={id} className={plan === id ? "selected" : ""}>
                <input
                  type="radio"
                  name="billing-plan"
                  value={id}
                  checked={plan === id}
                  onChange={() => setPlan(id)}
                />
                <span>
                  {id === "yearly" ? "À l’année" : "Au mois"}
                  <strong>
                    {item.price}
                    <small> / {id === "yearly" ? "an" : "mois"}</small>
                  </strong>
                  {id === "yearly" ? (
                    <span>Facturé une fois par an</span>
                  ) : (
                    <span>Facturé chaque mois</span>
                  )}
                </span>
              </label>
            ))}
          </fieldset>
          <button
            className="button primary full-width"
            disabled={!billing.configured || busy}
            onClick={() => void checkout()}
          >
            {busy
              ? "Vérification…"
              : !billing.configured
                ? "Paiement à configurer"
                : state.user.guest
                  ? "Créer un compte pour souscrire"
                  : testMode
                    ? "Souscrire en mode test"
                    : `S’abonner pour ${premiumPlans[plan].price} / ${plan === "yearly" ? "an" : "mois"}`}
            <ArrowRight size={18} />
          </button>
        </>
      )}
      {billing.configured && !state.user.guest && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Actualiser mes droits
        </button>
      )}
      {message && (
        <p className="inline-notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        className="button secondary full-width"
        onClick={() => {
          if (onClose) onClose();
          else navigate("today");
        }}
      >
        Continuer gratuitement <ArrowRight size={18} />
      </button>
    </div>
  );
}
export function Premium({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Votre abonnement Parlio" onClose={onClose}>
      <PremiumContent onClose={onClose} />
    </Modal>
  );
}
export function SubscriptionManager() {
  const { state, reportError } = useApp();
  const [busy, setBusy] = useState(false);
  if (state.user.guest || !state.billing.membership.premium) return null;
  async function portal() {
    setBusy(true);
    try {
      const result = await api<{ url: string }>("/billing/portal", "POST", {});
      window.location.assign(result.url);
    } catch (e) {
      reportError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <button
      className="button secondary"
      disabled={busy}
      onClick={() => void portal()}
    >
      <CreditCard size={17} />
      {busy
        ? "Ouverture…"
        : state.billing.mode === "test"
          ? "Gérer mon abonnement de test"
          : "Gérer ou résilier mon abonnement"}
      <ExternalLink size={15} />
    </button>
  );
}
