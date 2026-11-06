import test from "node:test";
import { rmSync } from "node:fs";
import assert from "node:assert/strict";
import Stripe from "stripe";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/app";
import type { BillingSettings } from "../server/billing";

const settings: BillingSettings = {
  secretKey: "sk_test_fixture_not_a_real_key",
  webhookSecret: "whsec_fixture_not_a_real_secret",
  monthlyPrice: "price_test_monthly",
  yearlyPrice: "price_test_yearly",
  appUrl: "https://parlio.example.test",
};
async function fixture(
  override: Partial<BillingSettings> = {},
  databasePath = ":memory:",
) {
  const isLive = override.mode === "live";
  const stripe = new Stripe(settings.secretKey!);
  let sequence = 0;
  let creates = 0;
  const openSessions: any[] = [];
  let removed = 0;
  let subscriptions: unknown[] = [];
  let list: () => Promise<{ data: unknown[] }> = async () => ({
    data: subscriptions,
  });
  const monthly = {
    id: settings.monthlyPrice,
    active: true,
    livemode: isLive,
    currency: "eur",
    unit_amount: 1099,
    recurring: { interval: "month", interval_count: 1 },
  };
  const yearly = {
    ...monthly,
    id: settings.yearlyPrice,
    unit_amount: 6999,
    recurring: { interval: "year", interval_count: 1 },
  };
  stripe.prices.retrieve = (async (id: string) =>
    id === settings.monthlyPrice
      ? monthly
      : yearly) as typeof stripe.prices.retrieve;
  stripe.customers.create = (async () => ({
    id: `cus_fixture_${++sequence}`,
  })) as typeof stripe.customers.create;
  stripe.customers.del = (async () => {
    removed++;
    return {
      id: "cus_deleted_fixture",
      object: "customer",
      deleted: true,
      lastResponse: { headers: {}, requestId: "req_fixture", statusCode: 200 },
    };
  }) as typeof stripe.customers.del;
  stripe.checkout.sessions.list = (async () => ({
    data: openSessions,
  })) as typeof stripe.checkout.sessions.list;
  stripe.checkout.sessions.expire = (async (id: string) => {
    const i = openSessions.findIndex((s) => s.id === id);
    if (i >= 0) openSessions.splice(i, 1);
    return { id };
  }) as typeof stripe.checkout.sessions.expire;
  stripe.checkout.sessions.create = (async (params: any) => {
    creates++;
    const session = {
      ...params,
      id: `cs_test_${creates}`,
      status: "open",
      url: `https://checkout.stripe.com/c/pay/cs_test_${creates}`,
      expires_at: Math.floor(Date.now() / 1000) + 1800,
      livemode: isLive,
    };
    openSessions.push(session);
    return session;
  }) as typeof stripe.checkout.sessions.create;
  stripe.subscriptions.list = (async () =>
    list()) as typeof stripe.subscriptions.list;
  let portalCustomer = "";
  stripe.billingPortal.sessions.create = (async (params: {
    customer: string;
  }) => {
    portalCustomer = params.customer;
    return { url: "https://billing.stripe.com/p/session/test_fixture" };
  }) as typeof stripe.billingPortal.sessions.create;
  const runtime = await createApp(databasePath, undefined, {
    billing: { settings: { ...settings, ...override }, stripe },
  });
  const server = await new Promise<Server>((resolve) => {
    const s = runtime.app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  class Client {
    cookie = "";
    async request(
      path: string,
      body?: unknown,
      method = body === undefined ? "GET" : "POST",
    ) {
      const r = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Parlio-Request": "1",
          ...(this.cookie ? { Cookie: this.cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const cookie = r.headers.get("set-cookie");
      if (cookie) this.cookie = cookie.split(";")[0];
      return { status: r.status, data: await r.json() };
    }
  }
  async function registered(email = "billing@example.test") {
    const c = new Client();
    await c.request("/api/state");
    const r = await c.request("/api/auth/register", {
      name: "Billing",
      email,
      password: "test-only-password-123",
    });
    assert.equal(r.status, 201);
    return c;
  }
  async function notify(
    customer: string,
    id: string = randomUUID(),
    type = "customer.subscription.updated",
    valid = true,
    live = isLive,
  ) {
    const body = JSON.stringify(
      {
        id,
        object: "event",
        livemode: live,
        type,
        created: 1,
        data: { object: { id: "sub_fixture", customer } },
      },
      null,
      2,
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: valid ? settings.webhookSecret! : "whsec_wrong_fixture",
    });
    const r = await fetch(base + "/api/billing/webhook", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
      body,
    });
    return { status: r.status, data: await r.json() };
  }
  async function cid(c: Client) {
    const s = await c.request("/api/state");
    return (
      (await runtime.db
        .prepare(
          `SELECT customer_id FROM ${isLive ? "billing_live" : "billing"}_customers WHERE user_id=?`,
        )
        .get(s.data.user.id)) as { customer_id: string }
    ).customer_id;
  }
  function subscription(
    customer: string,
    status = "active",
    end = Math.floor(Date.now() / 1000) + 86400,
  ) {
    return {
      id: "sub_fixture",
      customer,
      status,
      livemode: isLive,
      cancel_at_period_end: false,
      items: {
        data: [{ price: monthly, quantity: 1, current_period_end: end }],
      },
    };
  }
  return {
    runtime,
    Client,
    registered,
    notify,
    cid,
    monthly,
    subscription,
    setSubscriptions: (value: unknown[]) => {
      subscriptions = value;
    },
    setList: (value: typeof list) => {
      list = value;
    },
    creates: () => creates,
    removed: () => removed,
    portalCustomer: () => portalCustomer,
    close: async () => {
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
      await runtime.close();
    },
  };
}
test("le paiement est réservé aux comptes et réutilise une demande identique sans attribuer de Premium", async () => {
  const f = await fixture();
  try {
    const guest = new f.Client();
    await guest.request("/api/state");
    assert.equal(
      (
        await guest.request("/api/billing/checkout", {
          plan: "monthly",
          requestId: randomUUID(),
        })
      ).status,
      401,
    );
    const c = await f.registered();
    const request = { plan: "monthly", requestId: randomUUID() };
    const first = await c.request("/api/billing/checkout", request);
    assert.equal(first.status, 200);
    assert.equal(first.data.mode, "test");
    const repeat = await c.request("/api/billing/checkout", request);
    assert.equal(repeat.data.url, first.data.url);
    assert.equal(f.creates(), 1);
    assert.equal(
      (await c.request("/api/state?checkout=success")).data.billing.membership
        .premium,
      false,
    );
    assert.equal(
      (
        await c.request("/api/billing/checkout", {
          ...request,
          price: 1,
          premium: true,
        })
      ).status,
      400,
    );
  } finally {
    await f.close();
  }
});
test("les prix sont vérifiés et une clé live ne peut pas activer un paiement réel", async () => {
  const f = await fixture();
  try {
    const c = await f.registered();
    f.monthly.unit_amount = 1;
    assert.equal(
      (
        await c.request("/api/billing/checkout", {
          plan: "monthly",
          requestId: randomUUID(),
        })
      ).status,
      503,
    );
    assert.equal(f.creates(), 0);
  } finally {
    await f.close();
  }
  const live = await fixture({ secretKey: "sk_live_fixture_not_a_real_key" });
  try {
    const c = await live.registered();
    assert.equal(
      (await c.request("/api/state")).data.billing.configured,
      false,
    );
    assert.equal(
      (
        await c.request("/api/billing/checkout", {
          plan: "monthly",
          requestId: randomUUID(),
        })
      ).status,
      503,
    );
    assert.equal(live.creates(), 0);
  } finally {
    await live.close();
  }
});
test("seules les notifications signées et un état Stripe vérifié ouvrent les droits, sans duplication", async () => {
  const f = await fixture();
  try {
    const c = await f.registered();
    await c.request("/api/billing/checkout", {
      plan: "monthly",
      requestId: randomUUID(),
    });
    const customer = await f.cid(c);
    f.setSubscriptions([f.subscription(customer)]);
    assert.equal(
      (await f.notify(customer, "evt_invalid", undefined, false)).status,
      400,
    );
    assert.equal(
      (await c.request("/api/state")).data.billing.membership.premium,
      false,
    );
    assert.equal(
      (await f.notify(customer, "evt_live", undefined, true, true)).status,
      400,
    );
    const first = await f.notify(customer, "evt_verified");
    assert.equal(first.status, 200);
    assert.equal(
      (await c.request("/api/state")).data.billing.membership.premium,
      true,
    );
    assert.equal((await f.notify(customer, "evt_verified")).status, 200);
    assert.equal(
      (
        (await f.runtime.db
          .prepare("SELECT count(*) AS n FROM billing_events")
          .get()) as { n: number }
      ).n,
      1,
    );
    f.setSubscriptions([f.subscription(customer, "canceled")]);
    await f.notify(customer, "evt_cancelled");
    assert.equal(
      (await c.request("/api/state")).data.billing.membership.premium,
      false,
    );
    await f.notify("cus_foreign", "evt_foreign");
    assert.equal(
      (await c.request("/api/state")).data.billing.membership.premium,
      false,
    );
  } finally {
    await f.close();
  }
});
test("une réconciliation ancienne ne peut pas réactiver un abonnement après une plus récente", async () => {
  const f = await fixture();
  try {
    const c = await f.registered();
    await c.request("/api/billing/checkout", {
      plan: "monthly",
      requestId: randomUUID(),
    });
    const customer = await f.cid(c);
    let release!: (value: { data: unknown[] }) => void;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    let calls = 0;
    f.setList(async () => {
      if (++calls === 1) {
        started();
        return new Promise((resolve) => {
          release = resolve;
        });
      }
      return { data: [f.subscription(customer, "canceled")] };
    });
    const older = f.notify(customer, "evt_older");
    await ready;
    await f.notify(customer, "evt_newer");
    release({ data: [f.subscription(customer)] });
    await older;
    assert.equal(
      (await c.request("/api/state")).data.billing.membership.premium,
      false,
    );
  } finally {
    await f.close();
  }
});
test("le portail et la suppression du client Stripe restent limités au propriétaire", async () => {
  const f = await fixture();
  try {
    const a = await f.registered("a@example.test");
    const b = await f.registered("b@example.test");
    await a.request("/api/billing/checkout", {
      plan: "monthly",
      requestId: randomUUID(),
    });
    const customer = await f.cid(a);
    assert.equal(
      (await b.request("/api/billing/portal", { customer })).status,
      400,
    );
    assert.equal(f.portalCustomer(), "");
    assert.equal((await a.request("/api/billing/portal", {})).status, 200);
    assert.equal(f.portalCustomer(), customer);
    assert.equal(
      (await a.request("/api/account", { password: "bad-password" }, "DELETE"))
        .status,
      401,
    );
    assert.equal(f.removed(), 0);
    assert.equal(
      (
        await a.request(
          "/api/account",
          { password: "test-only-password-123" },
          "DELETE",
        )
      ).status,
      200,
    );
    assert.equal(f.removed(), 1);
    assert.equal(
      (
        (await f.runtime.db
          .prepare("SELECT count(*) AS n FROM billing_customers")
          .get()) as { n: number }
      ).n,
      0,
    );
    assert.equal(
      (await b.request("/api/state")).data.user.email,
      "b@example.test",
    );
  } finally {
    await f.close();
  }
});

test("le paiement réel exige son activation, isole les droits de test et vérifie le mode des notifications", async () => {
  const path = `/tmp/parlio-live-${randomUUID()}.sqlite`;
  const fixtures: Awaited<ReturnType<typeof fixture>>[] = [];
  try {
    const demo = await fixture({}, path);
    fixtures.push(demo);
    const a = await demo.registered();
    await a.request("/api/billing/checkout", {
      plan: "monthly",
      requestId: randomUUID(),
    });
    const testCustomer = await demo.cid(a);
    demo.setSubscriptions([demo.subscription(testCustomer)]);
    assert.equal((await demo.notify(testCustomer)).status, 200);
    assert.equal(
      (await a.request("/api/billing")).data.membership.premium,
      true,
    );
    const blocked = await fixture(
      { mode: "live", secretKey: "sk_live_fixture_never_sent" },
      path,
    );
    fixtures.push(blocked);
    const b = new blocked.Client();
    b.cookie = a.cookie;
    assert.equal((await b.request("/api/billing")).data.configured, false);
    assert.equal(
      (
        await b.request("/api/billing/checkout", {
          plan: "monthly",
          requestId: randomUUID(),
        })
      ).status,
      503,
    );
    assert.equal(blocked.creates(), 0);
    const live = await fixture(
      {
        mode: "live",
        commerceReady: true,
        secretKey: "sk_live_fixture_never_sent",
      },
      path,
    );
    fixtures.push(live);
    const c = new live.Client();
    c.cookie = a.cookie;
    const overview = await c.request("/api/billing");
    assert.equal(overview.data.mode, "live");
    assert.equal(overview.data.configured, true);
    assert.equal(overview.data.membership.premium, false);
    assert.equal(
      (
        await c.request("/api/billing/checkout", {
          plan: "yearly",
          requestId: randomUUID(),
        })
      ).status,
      200,
    );
    const customer = await live.cid(c);
    live.setSubscriptions([live.subscription(customer)]);
    assert.equal(
      (await live.notify(customer, "evt_wrong_mode", undefined, true, false))
        .status,
      400,
    );
    assert.equal((await live.notify(customer)).status, 200);
    assert.equal(
      (await c.request("/api/billing")).data.membership.premium,
      true,
    );
    assert.equal(
      (await c.request("/api/billing")).data.membership.mode,
      "live",
    );
    assert.equal(
      (
        await a.request(
          "/api/account",
          { password: "test-only-password-123" },
          "DELETE",
        )
      ).status,
      503,
    );
    live.setSubscriptions([live.subscription(customer, "canceled")]);
    await live.notify(customer);
    assert.equal(
      (await c.request("/api/billing")).data.membership.premium,
      false,
    );
    assert.equal(
      (await a.request("/api/billing")).data.membership.premium,
      true,
    );
    assert.equal(
      (
        await c.request(
          "/api/account",
          { password: "test-only-password-123" },
          "DELETE",
        )
      ).status,
      200,
    );
    assert.equal(live.removed(), 1);
  } finally {
    for (const f of fixtures.reverse()) await f.close();
    for (const suffix of ["", "-wal", "-shm"])
      rmSync(path + suffix, { force: true });
  }
});

test("deux demandes de paiement simultanées ne créent pas deux souscriptions et un changement de formule ferme la session précédente", async () => {
  const f = await fixture();
  try {
    const c = await f.registered();
    const replies = await Promise.all(
      [1, 2].map(() =>
        c.request("/api/billing/checkout", {
          plan: "monthly",
          requestId: randomUUID(),
        }),
      ),
    );
    assert.ok(replies.some((r) => r.status === 200));
    assert.ok(replies.every((r) => r.status === 200 || r.status === 409));
    assert.equal(f.creates(), 1);
    const retry = await c.request("/api/billing/checkout", {
      plan: "monthly",
      requestId: randomUUID(),
    });
    assert.equal(retry.status, 200);
    assert.equal(f.creates(), 1);
    const yearly = await c.request("/api/billing/checkout", {
      plan: "yearly",
      requestId: randomUUID(),
    });
    assert.equal(yearly.status, 200);
    assert.equal(f.creates(), 2);
    assert.notEqual(yearly.data.url, retry.data.url);
  } finally {
    await f.close();
  }
});
