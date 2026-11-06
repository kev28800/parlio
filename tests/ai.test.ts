import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import { createApp } from "../server/app";
import { freeMembership } from "../shared/billing";

const tutor = {
  reply: "Hallo ! Pour te présenter, tu peux dire : Ich bin Alex.",
  correction: "Avec ich, on emploie bin.",
  nextPrompt: "Wie heißt du?",
};
const practice = {
  exercises: [
    {
      type: "choice",
      instruction: "Choisissez la traduction",
      prompt: "Hallo",
      options: ["Bonjour", "Merci", "Au revoir"],
      answers: ["Bonjour"],
      explanation: "Hallo est une salutation pour dire bonjour.",
    },
    {
      type: "write",
      instruction: "Traduisez en allemand",
      prompt: "Merci",
      options: [],
      answers: ["Danke"],
      explanation: "Danke permet de remercier une personne.",
    },
    {
      type: "choice",
      instruction: "Choisissez la traduction",
      prompt: "Tschüss",
      options: ["Bonjour", "Merci", "Au revoir"],
      answers: ["Au revoir"],
      explanation: "Tschüss signifie au revoir dans un contexte familier.",
    },
    {
      type: "write",
      instruction: "Traduisez en allemand",
      prompt: "Je suis Alex.",
      options: [],
      answers: ["Ich bin Alex"],
      explanation: "Avec ich, le verbe sein devient bin.",
    },
  ],
};
async function fixture(
  options: {
    dailyLimit?: number;
    globalLimit?: number;
    configured?: boolean;
  } = {},
) {
  let calls = 0;
  let produce = async (_instructions: string, _input: string, name: string) =>
    JSON.stringify(name === "language_tutor" ? tutor : practice);
  const captured: { instructions: string; input: string; name: string }[] = [];
  const runtime = await createApp(":memory:", undefined, {
    billing: { settings: {} },
    ai: {
      settings: {
        apiKey: options.configured === false ? undefined : "fixture_never_sent",
        dailyLimit: options.dailyLimit ?? 20,
        globalDailyLimit: options.globalLimit ?? 100,
      },
      generate: async (instructions, input, _schema, name) => {
        calls++;
        captured.push({ instructions, input, name });
        return produce(instructions, input, name);
      },
    },
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
      const response = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-Parlio-Request": "1",
          Cookie: this.cookie,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const cookie = response.headers.get("set-cookie");
      if (cookie) this.cookie = cookie.split(";")[0];
      return { status: response.status, data: await response.json() };
    }
  }
  async function registered(premium = false) {
    const client = new Client();
    const state = await client.request("/api/state");
    const email = `learner-${randomUUID()}@example.test`;
    const signup = await client.request("/api/auth/register", {
      name: "Prénom privé",
      email,
      password: "fixture-only-password-123",
    });
    assert.equal(signup.status, 201);
    if (premium)
      await runtime.db
        .prepare("INSERT INTO billing_memberships (user_id,data) VALUES (?,?)")
        .run(
          state.data.user.id,
          JSON.stringify({
            ...freeMembership(),
            premium: true,
            status: "active",
            plan: "monthly",
            periodEnd: new Date(Date.now() + 86400000).toISOString(),
          }),
        );
    await client.request("/api/preferences", { courseId: "de" }, "PATCH");
    return { client, id: state.data.user.id, email };
  }
  return {
    runtime,
    Client,
    registered,
    calls: () => calls,
    captured,
    output: (fn: typeof produce) => {
      produce = fn;
    },
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await runtime.close();
    },
  };
}
const chat = (message = "Je voudrais me présenter.", id = randomUUID()) => ({
  requestId: id,
  message,
  consent: true,
});

test("le tuteur vérifie le compte, les droits et le consentement avant tout appel externe", async (t) => {
  const f = await fixture();
  t.after(f.close);
  const guest = new f.Client();
  await guest.request("/api/state");
  assert.equal((await guest.request("/api/ai/tutor", chat())).status, 401);
  const free = await f.registered();
  assert.equal(
    (await free.client.request("/api/ai/tutor", chat())).status,
    403,
  );
  assert.equal((await free.client.request("/api/premium/stats")).status, 403);
  const paid = await f.registered(true);
  assert.equal(
    (await paid.client.request("/api/ai/tutor", { ...chat(), consent: false }))
      .status,
    400,
  );
  assert.equal(
    (
      await paid.client.request("/api/ai/tutor", {
        ...chat(),
        model: "forbidden-client-model",
      })
    ).status,
    400,
  );
  assert.equal(
    (await paid.client.request("/api/ai/tutor", chat("x".repeat(1201)))).status,
    400,
  );
  assert.equal(f.calls(), 0);
  const disabled = await fixture({ configured: false });
  t.after(disabled.close);
  const owner = await disabled.registered(true);
  assert.equal(
    (await owner.client.request("/api/ai/tutor", chat())).status,
    503,
  );
  assert.equal(disabled.calls(), 0);
  assert.equal(
    (await owner.client.request("/api/state")).data.ai.configured,
    false,
  );
});
test("les conversations sont privées, séparées par langue, effaçables et les requêtes répétées ne rappellent pas le modèle", async (t) => {
  const f = await fixture();
  t.after(f.close);
  const a = await f.registered(true);
  const b = await f.registered(true);
  const input = chat();
  const reply = await a.client.request("/api/ai/tutor", input);
  assert.equal(reply.status, 200);
  assert.equal(reply.data.courseId, "de");
  assert.equal(reply.data.messages.length, 2);
  assert.equal(reply.data.messages[1].text, tutor.reply);
  assert.match(f.captured[0].instructions, /allemand/);
  assert.ok(!f.captured[0].input.includes(a.email));
  assert.ok(!f.captured[0].input.includes("Prénom privé"));
  assert.equal((await a.client.request("/api/ai/tutor", input)).status, 200);
  assert.equal(f.calls(), 1);
  assert.equal(
    (await b.client.request("/api/ai/conversation")).data.messages.length,
    0,
  );
  const followup = await a.client.request(
    "/api/ai/tutor",
    chat("Ich heiße Alex."),
  );
  assert.equal(followup.status, 200);
  assert.equal(
    JSON.parse(f.captured[1].input).conversation[1].nextPrompt,
    tutor.nextPrompt,
  );
  await a.client.request("/api/preferences", { courseId: "es" }, "PATCH");
  assert.equal(
    (await a.client.request("/api/ai/conversation")).data.messages.length,
    0,
  );
  await a.client.request("/api/preferences", { courseId: "de" }, "PATCH");
  assert.equal(
    (await a.client.request("/api/ai/conversation")).data.messages.length,
    4,
  );
  assert.equal(
    (await a.client.request("/api/ai/conversation", {}, "DELETE")).status,
    200,
  );
  assert.equal(
    (await a.client.request("/api/ai/conversation")).data.messages.length,
    0,
  );
  assert.equal((await a.client.request("/api/ai/tutor", input)).status, 409);
  assert.equal(f.calls(), 2);
});
test("les quotas persistants sont réservés avant l’appel, y compris en concurrence et après un échec", async (t) => {
  const f = await fixture({ dailyLimit: 2, globalLimit: 3 });
  t.after(f.close);
  const a = await f.registered(true);
  const b = await f.registered(true);
  let unblock!: () => void;
  const wait = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  f.output(async () => {
    await wait;
    return JSON.stringify(tutor);
  });
  const first = a.client.request("/api/ai/tutor", chat());
  while (f.calls() === 0)
    await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(
    (await a.client.request("/api/ai/tutor", chat("Autre question"))).status,
    409,
  );
  assert.equal(f.calls(), 1);
  unblock();
  assert.equal((await first).status, 200);
  f.output(async () => {
    throw new Error("fixture_never_sent: private provider error");
  });
  const failed = await a.client.request(
    "/api/ai/tutor",
    chat("Deuxième question"),
  );
  assert.equal(failed.status, 503);
  assert.ok(!JSON.stringify(failed.data).includes("private provider"));
  assert.equal(
    (await a.client.request("/api/ai/tutor", chat("Troisième question")))
      .status,
    429,
  );
  f.output(async () => JSON.stringify(tutor));
  assert.equal((await b.client.request("/api/ai/tutor", chat())).status, 200);
  assert.equal(
    (await b.client.request("/api/ai/tutor", chat("Quota global"))).status,
    429,
  );
  assert.equal(f.calls(), 3);
});
test("la séance IA du jour garde les solutions côté serveur, se reprend et attribue ses points une seule fois", async (t) => {
  const f = await fixture();
  t.after(f.close);
  const a = await f.registered(true);
  const b = await f.registered(true);
  let r = await a.client.request("/api/ai/practice", { consent: true });
  assert.equal(r.status, 201);
  const id = r.data.id;
  assert.equal(r.data.source, "ai");
  assert.equal(r.data.total, 4);
  assert.equal(r.data.exercise.answers, undefined);
  assert.equal(
    (await a.client.request("/api/runs", { mode: "review" })).status,
    400,
  );
  assert.equal(
    (await a.client.request("/api/ai/practice", { consent: true })).data.id,
    id,
  );
  assert.equal(f.calls(), 1);
  assert.equal((await b.client.request(`/api/runs/${id}`)).status, 404);
  for (let i = 0; i < 4; i++) {
    r = await a.client.request(`/api/runs/${id}/answer`, {
      index: i,
      answer: practice.exercises[i].answers[0],
    });
    assert.equal(r.data.feedback.correct, true);
    r = await a.client.request(`/api/runs/${id}/next`, { index: i });
  }
  assert.equal(r.data.result.xp, 30);
  assert.equal(r.data.result.source, "ai");
  assert.equal(
    (await a.client.request(`/api/runs/${id}/next`, { index: 3 })).data.result
      .xp,
    30,
  );
  const state = await a.client.request("/api/state");
  assert.equal(state.data.stats.xp, 30);
  assert.equal(state.data.review.practiced, 0);
  assert.deepEqual(state.data.completed, []);
  assert.ok(
    (await a.client.request("/api/ai/practice", { consent: true })).data.result,
  );
  assert.equal(f.calls(), 1);
  const stats = await a.client.request("/api/premium/stats");
  assert.equal(stats.status, 200);
  assert.equal(stats.data.days.length, 30);
  assert.equal(
    stats.data.days.reduce((n: number, day: { xp: number }) => n + day.xp, 0),
    30,
  );
  assert.ok(
    stats.data.units.every((unit: { answered: number }) => unit.answered === 0),
  );
});
test("une sortie IA invalide est refusée ; une nouvelle tentative reste possible dans le quota", async (t) => {
  const f = await fixture();
  t.after(f.close);
  const a = await f.registered(true);
  f.output(async () =>
    JSON.stringify({
      exercises: [
        { ...practice.exercises[0], answers: ["Absent des choix"] },
        ...practice.exercises.slice(1),
      ],
    }),
  );
  assert.equal(
    (await a.client.request("/api/ai/practice", { consent: true })).status,
    503,
  );
  const count = (await f.runtime.db
    .prepare("SELECT count(*) AS n FROM runs WHERE user_id=?")
    .get(a.id)) as { n: number };
  assert.equal(count.n, 0);
  f.output(async () => JSON.stringify(practice));
  assert.equal(
    (await a.client.request("/api/ai/practice", { consent: true })).status,
    201,
  );
  assert.equal(f.calls(), 2);
  await a.client.request("/api/auth/logout", {});
  assert.equal((await a.client.request("/api/ai/conversation")).status, 401);
});

test("effacer une conversation bloque une réponse en cours et reste possible après la fin de Premium", async (t) => {
  const f = await fixture();
  t.after(f.close);
  const a = await f.registered(true);
  let unblock!: () => void;
  const pending = new Promise<void>((resolve) => {
    unblock = resolve;
  });
  f.output(async () => {
    await pending;
    return JSON.stringify(tutor);
  });
  const input = chat();
  const response = a.client.request("/api/ai/tutor", input);
  while (!f.calls()) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(
    (await a.client.request("/api/ai/conversation", {}, "DELETE")).status,
    200,
  );
  unblock();
  assert.equal((await response).status, 409);
  assert.deepEqual(
    (await a.client.request("/api/ai/conversation")).data.messages,
    [],
  );
  assert.equal((await a.client.request("/api/ai/tutor", input)).status, 409);
  await f.runtime.db
    .prepare("UPDATE billing_memberships SET data=? WHERE user_id=?")
    .run(JSON.stringify(freeMembership()), a.id);
  assert.equal((await a.client.request("/api/ai/conversation")).status, 200);
  assert.equal(
    (await a.client.request("/api/ai/conversation", {}, "DELETE")).status,
    200,
  );
  assert.equal((await a.client.request("/api/ai/tutor", chat())).status, 403);
  const disabled = await fixture({ globalLimit: 0 });
  t.after(disabled.close);
  const b = await disabled.registered(true);
  assert.equal((await b.client.request("/api/ai/tutor", chat())).status, 503);
  assert.equal(disabled.calls(), 0);
});
