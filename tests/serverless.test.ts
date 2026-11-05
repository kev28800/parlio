import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app";
import { createServerlessHandler } from "../server/serverless";
import { lessons } from "../shared/course";

async function listen(handler: ReturnType<typeof createServerlessHandler>) {
  const server = await new Promise<Server>((resolve) => {
    const s = createServer((req, res) => void handler(req, res));
    s.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return {
    base,
    stop: () =>
      new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      ),
  };
}
test("l’entrée serverless partage son initialisation et conserve compte et leçon après un démarrage à froid", async () => {
  const directory = mkdtempSync(join(tmpdir(), "parlio-serverless-"));
  const file = join(directory, "test.sqlite");
  let runtime: Awaited<ReturnType<typeof createApp>> | undefined;
  let count = 0;
  const initialize = async () => {
    count++;
    runtime = await createApp(file, {
      url: `file:${file}`,
      allowFileForTests: true,
    });
    return runtime;
  };
  let service = await listen(createServerlessHandler(initialize));
  let cookie = "";
  const request = async (path: string, body?: unknown) => {
    const response = await fetch(service.base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Parlio-Request": "1",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const session = response.headers.get("set-cookie");
    if (session) cookie = session.split(";")[0];
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    return data;
  };
  try {
    const checks = await Promise.all(
      Array.from({ length: 5 }, () => request("/api/health")),
    );
    assert.ok(checks.every((r) => r.status === "ok"));
    assert.equal(count, 1);
    await request("/api/state");
    let run = await request("/api/runs", { lessonId: lessons[0].id });
    for (const [index, e] of lessons[0].exercises.entries()) {
      const answer =
        e.type === "pairs"
          ? Object.fromEntries(e.pairs!.map((p) => [p.left, p.right]))
          : e.type === "arrange"
            ? e.answers[0].split(" ")
            : e.answers[0];
      const check = await request(`/api/runs/${run.id}/answer`, {
        index,
        answer,
      });
      assert.ok(check.feedback.correct);
      run = await request(`/api/runs/${run.id}/next`, { index });
    }
    assert.equal(run.result.xp, 60);
    const account = await request("/api/auth/register", {
      name: "Serverless",
      email: "serverless@example.test",
      password: "test-only-password-123",
    });
    assert.equal(account.stats.xp, 60);
    await service.stop();
    await runtime!.close();
    runtime = undefined;
    service = await listen(createServerlessHandler(initialize));
    const restored = await request("/api/state");
    assert.equal(restored.user.guest, false);
    assert.equal(restored.stats.xp, 60);
    assert.equal(count, 2);
    await request(`/api/runs/${run.id}/next`, { index: 7 });
    assert.equal((await request("/api/state")).stats.xp, 60);
  } finally {
    await service.stop();
    await runtime?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
test("une initialisation serverless échouée peut être retentée sans divulguer son erreur", async () => {
  let attempts = 0;
  let runtime: Awaited<ReturnType<typeof createApp>> | undefined;
  const service = await listen(
    createServerlessHandler(async () => {
      if (++attempts === 1) throw new Error("test-private-value-not-to-expose");
      runtime = await createApp(":memory:");
      return runtime;
    }),
  );
  try {
    const failed = await fetch(service.base + "/api/health");
    assert.equal(failed.status, 503);
    assert.ok(!(await failed.text()).includes("test-private-value"));
    const ready = await fetch(service.base + "/api/health");
    assert.equal(ready.status, 200);
    assert.equal(attempts, 2);
  } finally {
    await service.stop();
    await runtime?.close();
  }
});
test("l’entrée de production refuse un stockage local si la base distante n’est pas configurée", async () => {
  const previousUrl = process.env.DATABASE_URL;
  const previousToken = process.env.DATABASE_AUTH_TOKEN;
  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_AUTH_TOKEN;
  const service = await listen(createServerlessHandler());
  try {
    const response = await fetch(service.base + "/api/state");
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("set-cookie"), null);
  } finally {
    await service.stop();
    if (previousUrl !== undefined) process.env.DATABASE_URL = previousUrl;
    if (previousToken !== undefined)
      process.env.DATABASE_AUTH_TOKEN = previousToken;
  }
});
