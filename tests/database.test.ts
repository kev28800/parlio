import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "../server/database";
import { createApp } from "../server/app";

test("la base distante exige TLS et un jeton et ne masque pas une configuration absente", async () => {
  await assert.rejects(
    Database.open(":memory:", {
      url: "http://example.test",
      authToken: "test-only-token",
    }),
    /chiffrée/,
  );
  await assert.rejects(
    Database.open(":memory:", { url: "https://example.test" }),
    /DATABASE_AUTH_TOKEN/,
  );
  await assert.rejects(
    Database.open(":memory:", {
      url: "https://example.test?token=private",
      authToken: "test-only-token",
    }),
    /sans identifiant/,
  );
  const previous = process.env.REQUIRE_REMOTE_DATABASE;
  process.env.REQUIRE_REMOTE_DATABASE = "true";
  try {
    await assert.rejects(createApp(":memory:", undefined), /DATABASE_URL/);
  } finally {
    if (previous === undefined) delete process.env.REQUIRE_REMOTE_DATABASE;
    else process.env.REQUIRE_REMOTE_DATABASE = previous;
  }
});
for (const driver of ["native", "libsql"]) {
  test(`une transaction ${driver} annulée ne laisse aucune écriture et ne mélange pas les requêtes`, async () => {
    const directory = mkdtempSync(join(tmpdir(), "parlio-transaction-"));
    const path = join(directory, "test.sqlite");
    const db = await Database.open(
      path,
      driver === "libsql"
        ? { url: `file:${path}`, allowFileForTests: true }
        : undefined,
    );
    try {
      await db.exec(
        "CREATE TABLE example (id INTEGER PRIMARY KEY, value TEXT)",
      );
      await assert.rejects(
        db.transaction(async () => {
          await db.prepare("INSERT INTO example VALUES (?,?)").run(1, "annulé");
          throw new Error("annulation volontaire");
        }),
        /annulation volontaire/,
      );
      assert.equal((await db.prepare("SELECT * FROM example").all()).length, 0);
      await Promise.all([
        db.transaction(async () => {
          await db
            .prepare("INSERT INTO example VALUES (?,?)")
            .run(1, "premier");
          await new Promise((resolve) => setTimeout(resolve, 15));
          await db.prepare("INSERT INTO example VALUES (?,?)").run(2, "second");
        }),
        db.prepare("INSERT INTO example VALUES (?,?)").run(3, "séparé"),
      ]);
      assert.equal((await db.prepare("SELECT * FROM example").all()).length, 3);
    } finally {
      await db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
