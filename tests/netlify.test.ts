import test from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { createApp } from "../server/app";
import { createNetlifyHandler } from "../server/netlify";

test("l’adaptateur Netlify conserve sessions, chemins API et octets signés du webhook", async () => {
  const secret = "whsec_netlify_fixture_only";
  const stripe = new Stripe("sk_test_netlify_fixture_only");
  const runtime = await createApp(":memory:", undefined, {
    billing: {
      settings: {
        secretKey: "sk_test_netlify_fixture_only",
        webhookSecret: secret,
        monthlyPrice: "price_fixture_monthly",
        yearlyPrice: "price_fixture_yearly",
        appUrl: "https://example.netlify.app",
      },
      stripe,
    },
  });
  let boots = 0;
  const handler = createNetlifyHandler(async () => {
    boots++;
    return runtime;
  });
  let cookie = "";
  async function request(
    path: string,
    body?: unknown,
    extra: Record<string, string> = {},
    raw?: string,
  ) {
    const payload =
      raw ?? (body === undefined ? undefined : JSON.stringify(body));
    const result = (await handler(
      {
        httpMethod: payload === undefined ? "GET" : "POST",
        path: `/.netlify/functions/api${path}`,
        headers: {
          host: "example.netlify.app",
          "content-type": "application/json",
          "x-parlio-request": "1",
          cookie,
          ...extra,
        },
        body:
          payload === undefined
            ? null
            : Buffer.from(payload).toString("base64"),
        isBase64Encoded: payload !== undefined,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        requestContext: { identity: { sourceIp: "127.0.0.1" } },
      },
      {},
    )) as {
      statusCode: number;
      body: string;
      headers?: Record<string, string>;
      multiValueHeaders?: Record<string, string[]>;
    };
    const setCookie =
      result.multiValueHeaders?.["set-cookie"]?.[0] ??
      result.headers?.["set-cookie"];
    if (setCookie) cookie = setCookie.split(";")[0];
    return { status: result.statusCode, data: JSON.parse(result.body) };
  }
  try {
    assert.equal((await request("/api/health")).status, 200);
    const state = await request("/api/state");
    assert.equal(state.status, 200);
    assert.ok(cookie.startsWith("parlio_session="));
    assert.equal(
      (await request("/api/state")).data.user.id,
      state.data.user.id,
    );
    const run = await request("/api/runs", { lessonId: "de-u1-l1" });
    assert.equal(run.status, 201);
    assert.equal(run.data.exercise.prompt, "Hallo");
    const answer = await request(`/api/runs/${run.data.id}/answer`, {
      index: 0,
      answer: "Bonjour",
    });
    assert.equal(answer.data.feedback.correct, true);
    const raw = JSON.stringify(
      {
        id: "evt_netlify",
        type: "customer.subscription.updated",
        livemode: false,
        data: { object: { customer: "cus_unknown" } },
      },
      null,
      2,
    );
    const signature = stripe.webhooks.generateTestHeaderString({
      payload: raw,
      secret,
    });
    assert.equal(
      (
        await request(
          "/api/billing/webhook",
          undefined,
          { "stripe-signature": signature },
          raw,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "/api/billing/webhook",
          undefined,
          { "stripe-signature": "invalid" },
          raw,
        )
      ).status,
      400,
    );
    assert.equal(boots, 1);
  } finally {
    await runtime.close();
  }
});
