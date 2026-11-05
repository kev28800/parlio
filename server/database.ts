import { AsyncLocalStorage } from "node:async_hooks";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  createClient,
  type Client,
  type Transaction,
  type InValue,
} from "@libsql/client";

export interface RemoteDatabaseOptions {
  url: string;
  authToken?: string;
  allowFileForTests?: boolean;
}
type Scope = { database: Database; transaction?: Transaction };
const scope = new AsyncLocalStorage<Scope>();

/** SQLite local pour le développement, libSQL/Turso pour l'hébergement gratuit. */
export class Database {
  private waiting: Promise<void> = Promise.resolve();
  private constructor(
    private native: DatabaseSync | null,
    private client: Client | null,
  ) {}

  static async open(path: string, remote?: RemoteDatabaseOptions) {
    if (remote) {
      const url = new URL(remote.url);
      const fileForTest = remote.allowFileForTests && url.protocol === "file:";
      if (!fileForTest && !["https:", "libsql:"].includes(url.protocol))
        throw new Error(
          "DATABASE_URL doit utiliser une connexion chiffrée HTTPS ou libsql.",
        );
      if (url.username || url.password || url.search || url.hash)
        throw new Error(
          "Utilisez une URL de base sans identifiant, paramètre ni jeton.",
        );
      if (!fileForTest && !remote.authToken?.trim())
        throw new Error(
          "DATABASE_AUTH_TOKEN manque pour la base distante. Aucun stockage temporaire de remplacement n'a été utilisé.",
        );
      const client = createClient({
        url:
          url.protocol === "libsql:"
            ? remote.url.replace(/^libsql:/, "https:")
            : remote.url,
        authToken: remote.authToken,
      });
      return new Database(null, client);
    }
    if (path !== ":memory:")
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    const native = new DatabaseSync(path);
    if (path !== ":memory:") chmodSync(path, 0o600);
    native.exec(
      "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
    );
    return new Database(native, null);
  }
  private async locked<T>(fn: () => Promise<T> | T): Promise<T> {
    if (scope.getStore()?.database === this) return fn();
    const previous = this.waiting;
    let release!: () => void;
    this.waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }
  prepare(sql: string) {
    return {
      get: async (...args: SQLInputValue[]) => (await this.rows(sql, args))[0],
      all: async (...args: SQLInputValue[]) => this.rows(sql, args),
      run: async (...args: SQLInputValue[]) =>
        this.locked(async () => {
          if (this.native) return this.native.prepare(sql).run(...args);
          const target = scope.getStore()?.transaction ?? this.client!;
          const result = await target.execute({ sql, args: args as InValue[] });
          return {
            changes: result.rowsAffected,
            lastInsertRowid: result.lastInsertRowid,
          };
        }),
    };
  }
  private async rows(
    sql: string,
    args: SQLInputValue[],
  ): Promise<Record<string, unknown>[]> {
    return this.locked(async () => {
      if (this.native) return this.native.prepare(sql).all(...args);
      const target = scope.getStore()?.transaction ?? this.client!;
      return (await target.execute({ sql, args: args as InValue[] }))
        .rows as unknown as Record<string, unknown>[];
    });
  }
  async exec(sql: string) {
    return this.locked(async () => {
      if (this.native) {
        this.native.exec(sql);
        return;
      }
      await (scope.getStore()?.transaction ?? this.client!).executeMultiple(
        sql,
      );
    });
  }
  async transaction<T>(fn: () => Promise<T> | T): Promise<T> {
    if (scope.getStore()?.database === this) return fn();
    return this.locked(async () => {
      if (this.native) {
        this.native.exec("BEGIN IMMEDIATE");
        try {
          const result = await scope.run({ database: this }, fn);
          this.native.exec("COMMIT");
          return result;
        } catch (error) {
          this.native.exec("ROLLBACK");
          throw error;
        }
      }
      const transaction = await this.client!.transaction("write");
      try {
        const result = await scope.run({ database: this, transaction }, fn);
        await transaction.commit();
        return result;
      } catch (error) {
        await transaction.rollback();
        throw error;
      } finally {
        transaction.close();
      }
    });
  }
  async close() {
    await this.locked(() => {
      this.native?.close();
      this.client?.close();
    });
  }
}
