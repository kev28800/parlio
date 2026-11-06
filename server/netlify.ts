import serverless from "serverless-http";
import { initializeProduction } from "./serverless.js";
import type { createApp } from "./app.js";

type Runtime = Pick<Awaited<ReturnType<typeof createApp>>, "app">;
/** Adaptateur Lambda ; conserve le corps brut nécessaire à la signature Stripe. */
export function createNetlifyHandler(
  initialize: () => Promise<Runtime> = initializeProduction,
) {
  let pending: Promise<ReturnType<typeof serverless>> | null = null;
  return async (event: Record<string, any>, context: Record<string, any>) => {
    process.env.COOKIE_SECURE ??= "true";
    process.env.TRUST_PROXY_HOPS ??= "1";
    try {
      pending ??= initialize()
        .then(({ app }) => serverless(app))
        .catch((error: unknown) => {
          pending = null;
          throw error;
        });
      const handler = await pending;
      const path =
        String(event.path || "/").replace(
          /^\/\.netlify\/functions\/api(?=\/|$)/,
          "",
        ) || "/";
      return await handler({ ...event, path }, context);
    } catch {
      return {
        statusCode: 503,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
        body: JSON.stringify({
          error:
            "Le service est momentanément indisponible. Réessayez dans un instant.",
        }),
      };
    }
  };
}
