import express, { type Express } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import type { Database } from "./database.js";
import {
  premiumPlans,
  freeMembership,
  type BillingOverview,
  type BillingPlan,
  type BillingMode,
  type Membership,
} from "../shared/billing.js";

export class BillingError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export interface BillingSettings {
  mode?: BillingMode;
  commerceReady?: boolean;
  secretKey?: string;
  webhookSecret?: string;
  monthlyPrice?: string;
  yearlyPrice?: string;
  appUrl?: string;
}
export interface BillingOverrides {
  settings?: BillingSettings;
  stripe?: Stripe;
}
type Account = {
  id: string;
  email: string | null;
  name: string;
  guest: number;
};
type CustomerRow = { user_id: string; customer_id: string };
export async function createBilling(
  db: Database,
  overrides: BillingOverrides = {},
) {
  const configuredMode: BillingMode =
    process.env.STRIPE_MODE === "live" ? "live" : "test";
  const settings = overrides.settings ?? {
    mode: configuredMode,
    commerceReady: process.env.BILLING_COMMERCE_READY === "true",
    secretKey:
      configuredMode === "live"
        ? process.env.STRIPE_SECRET_KEY
        : process.env.STRIPE_TEST_SECRET_KEY,
    webhookSecret:
      configuredMode === "live"
        ? process.env.STRIPE_WEBHOOK_SECRET
        : process.env.STRIPE_TEST_WEBHOOK_SECRET,
    monthlyPrice:
      configuredMode === "live"
        ? process.env.STRIPE_PRICE_MONTHLY
        : process.env.STRIPE_TEST_PRICE_MONTHLY,
    yearlyPrice:
      configuredMode === "live"
        ? process.env.STRIPE_PRICE_YEARLY
        : process.env.STRIPE_TEST_PRICE_YEARLY,
    appUrl: process.env.PUBLIC_APP_URL,
  };
  const mode = settings.mode ?? "test";
  const isLive = mode === "live";
  const tablePrefix = isLive ? "billing_live" : "billing";
  const validKey = Boolean(
    settings.secretKey &&
      new RegExp(`^(sk|rk)_${mode}_`).test(settings.secretKey),
  );
  const stripe =
    overrides.stripe ??
    (validKey
      ? new Stripe(settings.secretKey!, {
          maxNetworkRetries: 1,
          timeout: 15000,
        })
      : null);
  let origin: string | null = null;
  try {
    const url = new URL(settings.appUrl ?? "");
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/"
    )
      origin = url.origin;
  } catch {}
  const configured = Boolean(
    validKey &&
      (!isLive || settings.commerceReady === true) &&
      stripe &&
      origin &&
      settings.webhookSecret?.startsWith("whsec_") &&
      settings.monthlyPrice?.startsWith("price_") &&
      settings.yearlyPrice?.startsWith("price_"),
  );
  await db.exec(`CREATE TABLE IF NOT EXISTS ${tablePrefix}_customers (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, customer_id TEXT NOT NULL UNIQUE
  );
  CREATE TABLE IF NOT EXISTS ${tablePrefix}_memberships (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ${tablePrefix}_events (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, received_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ${tablePrefix}_checkout_requests (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, plan TEXT NOT NULL, url TEXT NOT NULL, expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ${tablePrefix}_revisions (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, revision INTEGER NOT NULL DEFAULT 0
  );`);
  await db.exec(
    `CREATE TABLE IF NOT EXISTS ${tablePrefix}_checkout_locks (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, owner TEXT NOT NULL, expires_at INTEGER NOT NULL)`,
  );
  async function checkoutLock<T>(
    uid: string,
    work: () => Promise<T>,
  ): Promise<T> {
    const owner = randomUUID();
    await db.transaction(async () => {
      const now = Date.now();
      await db
        .prepare(
          `INSERT INTO ${tablePrefix}_checkout_locks (user_id,owner,expires_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE expires_at<=?`,
        )
        .run(uid, owner, now + 90000, now);
      const lock = (await db
        .prepare(
          `SELECT owner FROM ${tablePrefix}_checkout_locks WHERE user_id=?`,
        )
        .get(uid)) as { owner: string };
      if (lock.owner !== owner)
        throw new BillingError(
          409,
          "Un paiement est en préparation. Patientez puis réessayez.",
        );
    });
    try {
      return await work();
    } finally {
      await db
        .prepare(
          `DELETE FROM ${tablePrefix}_checkout_locks WHERE user_id=? AND owner=?`,
        )
        .run(uid, owner);
    }
  }
  async function membership(uid: string): Promise<Membership> {
    const row = (await db
      .prepare(`SELECT data FROM ${tablePrefix}_memberships WHERE user_id=?`)
      .get(uid)) as { data: string } | undefined;
    if (!row) return freeMembership(mode);
    const stored = JSON.parse(row.data) as Membership;
    if (stored.mode !== mode) return freeMembership(mode);
    return {
      ...stored,
      premium:
        stored.premium &&
        Boolean(
          stored.periodEnd && new Date(stored.periodEnd).getTime() > Date.now(),
        ),
    };
  }
  async function overview(uid: string): Promise<BillingOverview> {
    return { configured, mode, membership: await membership(uid) };
  }
  function ready() {
    if (!configured || !stripe || !origin)
      throw new BillingError(
        503,
        "Les abonnements ne sont pas encore activés. Vous pouvez continuer à apprendre gratuitement.",
      );
    return { stripe, origin };
  }
  async function customer(uid: string) {
    return (await db
      .prepare(`SELECT * FROM ${tablePrefix}_customers WHERE user_id=?`)
      .get(uid)) as CustomerRow | undefined;
  }
  async function account(uid: string) {
    const row = (await db
      .prepare("SELECT id,email,name,guest FROM users WHERE id=?")
      .get(uid)) as Account | undefined;
    if (!row || row.guest)
      throw new BillingError(
        401,
        "Connectez-vous à votre compte pour gérer un abonnement.",
      );
    return row;
  }
  const attempts = new Map<string, { n: number; until: number }>();
  function limit(uid: string) {
    const previous = attempts.get(uid);
    if (!previous || previous.until < Date.now()) {
      attempts.set(uid, { n: 1, until: Date.now() + 60000 });
      return;
    }
    if (++previous.n > 8)
      throw new BillingError(429, "Patientez une minute avant de réessayer.");
  }
  function priceFor(plan: BillingPlan) {
    return plan === "monthly" ? settings.monthlyPrice! : settings.yearlyPrice!;
  }
  function planFor(price: Stripe.Price): BillingPlan | null {
    for (const plan of ["monthly", "yearly"] as const) {
      const expected = premiumPlans[plan];
      if (
        price.id === priceFor(plan) &&
        price.livemode === isLive &&
        price.currency === "eur" &&
        price.unit_amount === expected.amount &&
        price.recurring?.interval === expected.interval &&
        price.recurring.interval_count === 1
      )
        return plan;
    }
    return null;
  }
  async function reconcile(uid: string, cid: string): Promise<Membership> {
    const { stripe } = ready();
    const current = await stripe.subscriptions.list({
      customer: cid,
      status: "all",
      limit: 100,
      expand: ["data.items.data.price"],
    });
    let next = freeMembership(mode);
    let bestEnd = 0;
    for (const sub of current.data) {
      const owner =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const item = sub.items.data[0];
      const plan = item ? planFor(item.price) : null;
      const end = item?.current_period_end ?? 0;
      if (
        sub.livemode !== isLive ||
        owner !== cid ||
        !plan ||
        sub.items.data.length !== 1 ||
        item.quantity !== 1
      )
        continue;
      if (
        (sub.status === "active" || sub.status === "trialing") &&
        end * 1000 > Date.now() &&
        end > bestEnd
      ) {
        bestEnd = end;
        next = {
          premium: true,
          mode,
          status: sub.status,
          plan,
          periodEnd: new Date(end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
      } else if (!next.premium)
        next = {
          ...next,
          status: sub.status,
          plan,
          periodEnd: new Date(end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        };
    }
    return next;
  }
  async function save(uid: string, value: Membership) {
    await db
      .prepare(
        `INSERT INTO ${tablePrefix}_memberships (user_id,data) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data`,
      )
      .run(uid, JSON.stringify(value));
  }
  async function synchronize(uid: string, cid: string, eventId?: string) {
    const revision = await db.transaction(async () => {
      if (!(await db.prepare("SELECT id FROM users WHERE id=?").get(uid)))
        return null;
      if (
        eventId &&
        (await db
          .prepare(`SELECT id FROM ${tablePrefix}_events WHERE id=?`)
          .get(eventId))
      )
        return null;
      await db
        .prepare(
          `INSERT INTO ${tablePrefix}_revisions (user_id,revision) VALUES (?,0) ON CONFLICT(user_id) DO NOTHING`,
        )
        .run(uid);
      await db
        .prepare(
          `UPDATE ${tablePrefix}_revisions SET revision=revision+1 WHERE user_id=?`,
        )
        .run(uid);
      return (
        (await db
          .prepare(
            `SELECT revision FROM ${tablePrefix}_revisions WHERE user_id=?`,
          )
          .get(uid)) as { revision: number }
      ).revision;
    });
    if (revision === null) return;
    const value = await reconcile(uid, cid);
    await db.transaction(async () => {
      const latest = (await db
        .prepare(
          `SELECT revision FROM ${tablePrefix}_revisions WHERE user_id=?`,
        )
        .get(uid)) as { revision: number } | undefined;
      if (!latest) return;
      if (latest.revision === revision) await save(uid, value);
      if (eventId)
        await db
          .prepare(
            `INSERT INTO ${tablePrefix}_events (id,user_id,received_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING`,
          )
          .run(eventId, uid, new Date().toISOString());
    });
  }
  function publicRoutes(app: Express) {
    app.post(
      "/api/billing/webhook",
      express.raw({ type: "application/json", limit: "256kb" }),
      async (req, res) => {
        if (!configured || !stripe) {
          res.status(503).json({ error: "Service de paiement non configuré." });
          return;
        }
        let event: Stripe.Event;
        try {
          const signature = req.get("stripe-signature");
          if (!signature || !Buffer.isBuffer(req.body)) throw new Error();
          event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            settings.webhookSecret!,
          );
          if (event.livemode !== isLive) throw new Error();
        } catch {
          res
            .status(400)
            .json({ error: "Signature de notification invalide." });
          return;
        }
        const accepted = [
          "checkout.session.completed",
          "checkout.session.async_payment_succeeded",
          "customer.subscription.created",
          "customer.subscription.updated",
          "customer.subscription.deleted",
          "invoice.paid",
          "invoice.payment_failed",
        ];
        if (!accepted.includes(event.type)) {
          res.json({ received: true });
          return;
        }
        const object = event.data.object as unknown as {
          customer?: string | { id: string };
        };
        const cid =
          typeof object.customer === "string"
            ? object.customer
            : object.customer?.id;
        if (!cid) {
          res.json({ received: true });
          return;
        }
        const link = (await db
          .prepare(`SELECT * FROM ${tablePrefix}_customers WHERE customer_id=?`)
          .get(cid)) as CustomerRow | undefined;
        if (
          !link ||
          (await db
            .prepare(`SELECT id FROM ${tablePrefix}_events WHERE id=?`)
            .get(event.id))
        ) {
          res.json({ received: true });
          return;
        }
        await synchronize(link.user_id, cid, event.id);
        res.json({ received: true });
      },
    );
  }
  function authenticatedRoutes(app: Express) {
    app.get("/api/billing", async (_req, res) =>
      res.json(await overview(res.locals.userId)),
    );
    app.post("/api/billing/checkout", async (req, res) => {
      const who = await account(res.locals.userId);
      limit(who.id);
      const { plan, requestId } = z
        .object({
          plan: z.enum(["monthly", "yearly"]),
          requestId: z.string().uuid(),
        })
        .strict()
        .parse(req.body);
      return checkoutLock(who.id, async () => {
        const { stripe, origin } = ready();
        const previousCustomer = await customer(who.id);
        if (previousCustomer)
          await synchronize(who.id, previousCustomer.customer_id);
        if ((await membership(who.id)).premium)
          throw new BillingError(
            409,
            "Votre abonnement est déjà actif. Gérez-le depuis votre profil.",
          );
        const price = await stripe.prices.retrieve(priceFor(plan));
        if (planFor(price) !== plan || !price.active)
          throw new BillingError(
            503,
            "Ce tarif n’est pas encore disponible. Aucun paiement n’a été lancé.",
          );
        let link = await customer(who.id);
        if (!link) {
          const created = await stripe.customers.create(
            {
              email: who.email!,
              name: who.name,
              metadata: { parlio_user_id: who.id },
            },
            { idempotencyKey: `parlio-${mode}-customer:${who.id}` },
          );
          await db
            .prepare(
              `INSERT INTO ${tablePrefix}_customers (user_id,customer_id) VALUES (?,?) ON CONFLICT(user_id) DO NOTHING`,
            )
            .run(who.id, created.id);
          link = await customer(who.id);
        }
        const open = await stripe.checkout.sessions.list({
          customer: link!.customer_id,
          status: "open",
          limit: 100,
        });
        for (const pending of open.data) {
          if (
            pending.livemode !== isLive ||
            pending.mode !== "subscription" ||
            pending.client_reference_id !== who.id ||
            pending.metadata?.parlio_app !== "parlio"
          )
            continue;
          if (
            pending.metadata.plan === plan &&
            pending.metadata.price_id === priceFor(plan) &&
            pending.url &&
            new URL(pending.url).protocol === "https:" &&
            new URL(pending.url).hostname === "checkout.stripe.com"
          ) {
            res.json({ url: pending.url, mode });
            return;
          }
          await stripe.checkout.sessions.expire(pending.id);
        }
        const checkout = await stripe.checkout.sessions.create(
          {
            mode: "subscription",
            customer: link!.customer_id,
            client_reference_id: who.id,
            metadata: { parlio_app: "parlio", plan, price_id: priceFor(plan) },
            expires_at: Math.floor(Date.now() / 1000) + 1800,
            allowed_payment_method_types: ["card"],
            line_items: [{ price: priceFor(plan), quantity: 1 }],
            success_url: `${origin}/#premium?checkout=success`,
            cancel_url: `${origin}/#premium?checkout=cancelled`,
            subscription_data: { metadata: { parlio_user_id: who.id } },
          },
          {
            idempotencyKey: `parlio-${mode}-checkout:${who.id}:${plan}:${requestId}`,
          },
        );
        if (
          checkout.livemode !== isLive ||
          checkout.status !== "open" ||
          !checkout.url ||
          new URL(checkout.url).hostname !== "checkout.stripe.com" ||
          new URL(checkout.url).protocol !== "https:"
        )
          throw new BillingError(
            502,
            "Le paiement est momentanément indisponible.",
          );
        await db
          .prepare(
            `INSERT INTO ${tablePrefix}_checkout_requests (id,user_id,plan,url,expires_at) VALUES (?,?,?,?,?) ON CONFLICT(id) DO NOTHING`,
          )
          .run(requestId, who.id, plan, checkout.url, checkout.expires_at);
        res.json({ url: checkout.url, mode });
      });
    });
    app.post("/api/billing/refresh", async (_req, res) => {
      const who = await account(res.locals.userId);
      limit(who.id);
      const link = await customer(who.id);
      if (link) {
        await synchronize(who.id, link.customer_id);
      }
      res.json(await overview(who.id));
    });
    app.post("/api/billing/portal", async (_req, res) => {
      const who = await account(res.locals.userId);
      limit(who.id);
      const { stripe, origin } = ready();
      const link = await customer(who.id);
      if (!link)
        throw new BillingError(400, "Ce compte n’a pas d’abonnement à gérer.");
      const session = await stripe.billingPortal.sessions.create({
        customer: link.customer_id,
        return_url: `${origin}/#profile`,
      });
      const url = new URL(session.url);
      if (url.protocol !== "https:" || url.hostname !== "billing.stripe.com")
        throw new BillingError(
          502,
          "La gestion de l’abonnement est momentanément indisponible.",
        );
      res.json({ url: session.url });
    });
  }
  async function removeAccount(uid: string) {
    if (
      !isLive &&
      (await db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='billing_live_customers'",
        )
        .get())
    ) {
      const liveCustomer = await db
        .prepare(
          "SELECT customer_id FROM billing_live_customers WHERE user_id=?",
        )
        .get(uid);
      if (liveCustomer)
        throw new BillingError(
          503,
          "La configuration du paiement réel est nécessaire pour résilier votre abonnement avant de supprimer le compte.",
        );
    }
    const link = await customer(uid);
    if (!link) return;
    if (!stripe || !validKey)
      throw new BillingError(
        503,
        "La gestion de l’abonnement est indisponible. Réessayez avant de supprimer le compte.",
      );
    await stripe.customers.del(
      link.customer_id,
      {},
      { idempotencyKey: `parlio-${mode}-delete:${uid}` },
    );
  }
  async function requirePremium(uid: string) {
    if (!(await membership(uid)).premium)
      throw new BillingError(
        403,
        "Cette fonctionnalité fait partie de Parlio Premium.",
      );
  }
  return {
    overview,
    membership,
    requirePremium,
    publicRoutes,
    authenticatedRoutes,
    removeAccount,
  };
}
