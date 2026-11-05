import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "./app.js";

type Runtime = Pick<Awaited<ReturnType<typeof createApp>>, "app">;
type Initializer = () => Promise<Runtime>;

async function initializeProduction(): Promise<Runtime> {
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.DATABASE_AUTH_TOKEN?.trim();
  // Une fonction sans disque durable ne doit jamais utiliser la base locale.
  if (!url || !authToken)
    throw new Error("Configuration de la base distante manquante.");
  return createApp(undefined, { url, authToken });
}

/** Une initialisation partagée par instance chaude ; les écritures précèdent la réponse. */
export function createServerlessHandler(
  initialize: Initializer = initializeProduction,
) {
  let initialization: Promise<Runtime> | null = null;
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      if (!initialization) {
        initialization = initialize().catch((error: unknown) => {
          initialization = null;
          throw error;
        });
      }
      const { app } = await initialization;
      if (res.destroyed || res.writableEnded) return;
      await new Promise<void>((resolve, reject) => {
        const finish = () => {
          res.off("finish", finish);
          res.off("close", finish);
          resolve();
        };
        res.once("finish", finish);
        res.once("close", finish);
        try {
          app(req, res);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      console.error(
        "Initialisation Parlio :",
        error instanceof Error ? error.name : "erreur inconnue",
      );
      if (!res.headersSent) {
        res.statusCode = 503;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(
          JSON.stringify({
            error:
              "La sauvegarde est momentanément indisponible. Réessayez dans un instant.",
          }),
        );
      } else if (!res.writableEnded) res.end();
    }
  };
}
