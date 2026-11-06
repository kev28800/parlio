export const premiumPlans = {
  monthly: {
    id: "monthly",
    label: "Mensuel",
    amount: 1099,
    interval: "month",
    price: "10,99 €",
    suffix: "/ mois",
  },
  yearly: {
    id: "yearly",
    label: "Annuel",
    amount: 6999,
    interval: "year",
    price: "69,99 €",
    suffix: "/ an",
  },
} as const;
export type BillingPlan = keyof typeof premiumPlans;
export type BillingMode = "test" | "live";
export interface Membership {
  premium: boolean;
  mode: BillingMode;
  status: string;
  plan: BillingPlan | null;
  periodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}
export interface BillingOverview {
  configured: boolean;
  mode: BillingMode;
  membership: Membership;
}
export const freeMembership = (mode: BillingMode = "test"): Membership => ({
  premium: false,
  mode,
  status: "none",
  plan: null,
  periodEnd: null,
  cancelAtPeriodEnd: false,
});
