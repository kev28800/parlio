import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { createApp } from "../server/app";
import { exerciseById, lessonById, lessons } from "../shared/course";
import type { AppState, Exercise, RunView } from "../shared/types";
let runtime: Awaited<ReturnType<typeof createApp>>;
let server: Server;
let base: string;
const directory = mkdtempSync(join(tmpdir(), "parlio-test-"));
const database = join(directory, "test.sqlite");
async function boot() {
  runtime = await createApp(
    database,
    process.env.PARLIO_TEST_DRIVER === "libsql"
      ? { url: `file:${database}`, allowFileForTests: true }
      : undefined,
  );
  server = await new Promise<Server>((resolve) => {
    const s = runtime.app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${
    (
      server.address() as {
        port: number;
      }
    ).port
  }`;
}
async function stop() {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
  await runtime.close();
}
before(boot);
after(async () => {
  await stop();
  rmSync(directory, { recursive: true, force: true });
});
class Client {
  cookie = "";
  async request(
    path: string,
    method = "GET",
    body?: unknown,
    extra: Record<string, string> = {},
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Parlio-Request": "1",
        ...(this.cookie ? { Cookie: this.cookie } : {}),
        ...extra,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const cookie = response.headers.get("set-cookie");
    if (cookie) this.cookie = cookie.split(";")[0];
    const data = await response.json();
    return { response, data };
  }
  async state() {
    const { response, data } = await this.request("/api/state");
    assert.equal(response.status, 200);
    return data as AppState;
  }
}
const goodAnswer = (e: Exercise) =>
  e.type === "pairs"
    ? Object.fromEntries(e.pairs!.map((p) => [p.left, p.right]))
    : e.type === "arrange"
      ? e.answers[0].split(" ")
      : e.answers[0];
test("le contrôle de santé vérifie la base sans créer d’utilisateur ni de session", async () => {
  const count = async () =>
    (
      (await runtime.db
        .prepare("SELECT count(*) AS total FROM users")
        .get()) as {
        total: number;
      }
    ).total;
  const before = await count();
  for (let i = 0; i < 3; i++) {
    const response = await fetch(base + "/api/health");
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: "ok",
      service: "parlio",
    });
    assert.equal(response.headers.get("set-cookie"), null);
  }
  assert.equal(await count(), before);
});
async function finish(client: Client, run: RunView, wrongFirst = false) {
  const content = lessonById.get(run.lessonId!)!;
  for (let i = 0; i < run.total; i++) {
    const answer =
      wrongFirst && i === 0 ? "Au revoir" : goodAnswer(content.exercises[i]);
    let request = await client.request(`/api/runs/${run.id}/answer`, "POST", {
      index: i,
      answer,
    });
    assert.equal(request.response.status, 200);
    assert.equal(request.data.feedback.correct, !(wrongFirst && i === 0));
    request = await client.request(`/api/runs/${run.id}/next`, "POST", {
      index: i,
    });
    assert.equal(request.response.status, 200);
    run = request.data;
  }
  assert.ok(run.result);
  return run;
}
test("essai persistant, validations, correction et récompenses idempotentes", async () => {
  const client = new Client();
  const initial = await client.state();
  assert.ok(initial.user.guest);
  assert.equal(initial.stats.xp, 0);
  assert.equal(
    (await client.request("/api/runs", "POST", { lessonId: "u2-l1" })).response
      .status,
    403,
  );
  assert.equal(
    (
      await client.request("/api/preferences", "PATCH", {
        timezone: "not-a-zone",
      })
    ).response.status,
    400,
  );
  assert.equal(
    (await client.request("/api/preferences", "PATCH", { dailyMinutes: 999 }))
      .response.status,
    400,
  );
  assert.equal(
    (await client.request("/api/preferences", "PATCH", { xp: 999 })).response
      .status,
    400,
  );
  const preferences = {
    timezone: "America/Montreal",
    dailyMinutes: 10,
    onboarded: true,
  };
  assert.equal(
    (await client.request("/api/preferences", "PATCH", preferences)).response
      .status,
    200,
  );
  const { data: run } = await client.request("/api/runs", "POST", {
    lessonId: "u1-l1",
  });
  assert.equal(run.exercise.answers, undefined);
  assert.equal(run.exercise.explanation, undefined);
  assert.equal(
    (await client.request("/api/runs", "POST", { lessonId: "u1-l1" })).data.id,
    run.id,
  );
  const first = await client.request(`/api/runs/${run.id}/answer`, "POST", {
    index: 0,
    answer: "Bonjour",
  });
  assert.ok(first.data.feedback.correct);
  const repeat = await client.request(`/api/runs/${run.id}/answer`, "POST", {
    index: 0,
    answer: "Au revoir",
  });
  assert.ok(repeat.data.feedback.correct);
  assert.equal(
    (await client.state()).notions.find((n) => n.concept === "hello")!.attempts,
    1,
  );
  assert.ok(
    (await client.request(`/api/runs/${run.id}`)).data.feedback.correct,
  );
  const final = await finish(client, run);
  const completed = await client.state();
  assert.equal(completed.stats.xp, 60);
  assert.equal(completed.stats.todayMinutes, 5);
  assert.deepEqual(completed.completed, ["u1-l1"]);
  await Promise.all([
    client.request(`/api/runs/${run.id}/next`, "POST", { index: 7 }),
    client.request(`/api/runs/${run.id}/next`, "POST", { index: 7 }),
  ]);
  assert.equal((await client.state()).stats.xp, 60);
  assert.equal((await client.state()).history.length, 1);
  assert.equal(final.result!.correct, 8);
});
test("les erreurs n’empêchent pas de terminer et alimentent les révisions", async () => {
  const client = new Client();
  await client.state();
  const { data: run } = await client.request("/api/runs", "POST", {
    lessonId: "u1-l1",
  });
  const final = await finish(client, run, true);
  assert.equal(final.result!.correct, 7);
  assert.equal(final.result!.xp, 55);
  assert.ok(final.result!.toReview.includes("hello"));
  const { data: review, response } = await client.request("/api/runs", "POST", {
    mode: "review",
  });
  assert.equal(response.status, 201);
  assert.ok(review.total > 0);
  assert.ok(review.review);
  assert.ok((await client.state()).notions.some((n) => n.errors > 0));
});
test("l’inscription transfère l’essai, les comptes sont isolés et la suppression est complète", async () => {
  const alice = new Client();
  await alice.state();
  const { data: run } = await alice.request("/api/runs", "POST", {
    lessonId: "u1-l1",
  });
  await finish(alice, run);
  const oldCookie = alice.cookie;
  const registration = await alice.request("/api/auth/register", "POST", {
    name: "Alice",
    email: "alice@example.test",
    password: "a-secure-password-123",
  });
  assert.equal(registration.response.status, 201);
  assert.ok(!registration.data.user.guest);
  assert.equal(registration.data.stats.xp, 60);
  assert.notEqual(alice.cookie, oldCookie);
  assert.match(registration.response.headers.get("set-cookie")!, /HttpOnly/i);
  assert.match(
    registration.response.headers.get("set-cookie")!,
    /SameSite=Lax/i,
  );
  const userId = registration.data.user.id;
  const row = (await runtime.db
    .prepare("SELECT password FROM users WHERE id=?")
    .get(userId)) as {
    password: string;
  };
  assert.ok(!row.password.includes("a-secure-password-123"));
  const bob = new Client();
  await bob.state();
  await bob.request("/api/auth/register", "POST", {
    name: "Bob",
    email: "bob@example.test",
    password: "another-password-456",
  });
  assert.equal((await bob.state()).stats.xp, 0);
  for (const [path, method, body] of [
    [`/api/runs/${run.id}`, "GET", undefined],
    [`/api/runs/${run.id}/answer`, "POST", { index: 0, answer: "Bonjour" }],
    [`/api/runs/${run.id}/next`, "POST", { index: 7 }],
  ] as const)
    assert.equal((await bob.request(path, method, body)).response.status, 404);
  const stolen = new Client();
  stolen.cookie = oldCookie;
  assert.ok((await stolen.state()).user.guest);
  const otherDevice = new Client();
  await otherDevice.state();
  assert.equal(
    (
      await otherDevice.request("/api/auth/login", "POST", {
        email: "alice@example.test",
        password: "incorrect-password",
      })
    ).response.status,
    401,
  );
  const logged = await otherDevice.request("/api/auth/login", "POST", {
    email: "alice@example.test",
    password: "a-secure-password-123",
  });
  assert.equal(logged.response.status, 200);
  assert.equal(logged.data.stats.xp, 60);
  await alice.request("/api/auth/logout", "POST", {});
  assert.ok((await alice.state()).user.guest);
  assert.equal((await bob.state()).user.name, "Bob");
  await stop();
  await boot();
  assert.equal((await otherDevice.state()).stats.xp, 60);
  assert.equal(
    (
      await otherDevice.request("/api/account", "DELETE", {
        password: "incorrect-password",
      })
    ).response.status,
    401,
  );
  assert.equal(
    (
      await otherDevice.request("/api/account", "DELETE", {
        password: "a-secure-password-123",
      })
    ).response.status,
    200,
  );
  for (const table of ["notions", "runs", "sessions"])
    assert.equal(
      (
        (await runtime.db
          .prepare(`SELECT count(*) AS n FROM ${table} WHERE user_id=?`)
          .get(userId)) as {
          n: number;
        }
      ).n,
      0,
    );
  assert.equal(
    await runtime.db.prepare("SELECT id FROM users WHERE id=?").get(userId),
    undefined,
  );
  assert.equal((await bob.state()).user.name, "Bob");
});
test("les mutations intersites sont refusées", async () => {
  const client = new Client();
  await client.state();
  assert.equal(
    (
      await client.request(
        "/api/preferences",
        "PATCH",
        { sound: false },
        { Origin: "https://other-site.example" },
      )
    ).response.status,
    403,
  );
  assert.equal(
    (
      await client.request(
        "/api/preferences",
        "PATCH",
        { sound: false },
        { "X-Parlio-Request": "" },
      )
    ).response.status,
    403,
  );
  assert.ok((await client.state()).preferences.sound);
});
test("les 18 leçons puis une révision se terminent réellement via le serveur", async () => {
  const client = new Client();
  await client.state();
  for (const lesson of lessons) {
    const { response, data: run } = await client.request("/api/runs", "POST", {
      lessonId: lesson.id,
    });
    assert.equal(response.status, 201);
    await finish(client, run);
  }
  const complete = await client.state();
  assert.equal(complete.completed.length, 18);
  assert.equal(complete.history.length, 18);
  assert.equal(complete.stats.xp, 18 * 60);
  assert.equal(complete.stats.todayMinutes, 90);
  const { data: review } = await client.request("/api/runs", "POST", {
    mode: "review",
  });
  assert.equal(review.total, 8);
  let run = review as RunView;
  while (!run.result) {
    const e = exerciseById.get(run.exercise!.id)!;
    const answered = await client.request(
      `/api/runs/${run.id}/answer`,
      "POST",
      { index: run.index, answer: goodAnswer(e) },
    );
    assert.equal(answered.response.status, 200);
    assert.ok(answered.data.feedback.correct);
    run = (
      await client.request(`/api/runs/${run.id}/next`, "POST", {
        index: run.index,
      })
    ).data;
  }
  assert.ok(run.result.review);
  assert.equal(run.result.correct, 8);
  assert.equal((await client.state()).history.length, 19);
});
test("les tentatives de connexion répétées sont limitées", async () => {
  const client = new Client();
  await client.state();
  for (let i = 0; i < 10; i++)
    assert.equal(
      (
        await client.request("/api/auth/login", "POST", {
          email: "nobody@example.test",
          password: "not-the-password",
        })
      ).response.status,
      401,
    );
  assert.equal(
    (
      await client.request("/api/auth/login", "POST", {
        email: "nobody@example.test",
        password: "not-the-password",
      })
    ).response.status,
    429,
  );
});
test("les requêtes simultanées ne créent ni séance ni tentative en double", async () => {
  const client = new Client();
  await client.state();
  const starts = await Promise.all(
    Array.from({ length: 4 }, () =>
      client.request("/api/runs", "POST", { lessonId: "u1-l1" }),
    ),
  );
  assert.equal(new Set(starts.map((r) => r.data.id)).size, 1);
  const id = starts[0].data.id;
  const answers = await Promise.all(
    Array.from({ length: 4 }, () =>
      client.request(`/api/runs/${id}/answer`, "POST", {
        index: 0,
        answer: "Bonjour",
      }),
    ),
  );
  assert.ok(
    answers.every((r) => r.response.status === 200 && r.data.feedback.correct),
  );
  assert.equal(
    (await client.state()).notions.find((n) => n.concept === "hello")!.attempts,
    1,
  );
  const advances = await Promise.all(
    Array.from({ length: 4 }, () =>
      client.request(`/api/runs/${id}/next`, "POST", { index: 0 }),
    ),
  );
  assert.ok(
    advances.every((r) => r.response.status === 200 && r.data.index === 1),
  );
  await Promise.all([
    client.request("/api/preferences", "PATCH", { sound: false }),
    client.request("/api/preferences", "PATCH", { reducedMotion: true }),
  ]);
  const final = await client.state();
  assert.equal(final.preferences.sound, false);
  assert.equal(final.preferences.reducedMotion, true);
});
