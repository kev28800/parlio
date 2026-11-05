import express from "express";
import { resolve } from "node:path";
import { createServer as createHttpServer } from "node:http";
import { createApp } from "./app";

const { app, close } = await createApp();
const port = Number(process.env.PORT || 3000);
const server = createHttpServer(app);
let vite: import("vite").ViteDevServer | undefined;
if (process.env.NODE_ENV === "production") {
  app.use(express.static(resolve("dist")));
  app.get(/.*/, (_req, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
server.listen(port, "0.0.0.0", () =>
  console.log(`Parlio écoute sur le port ${port}.`),
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, async () => {
    await vite?.close();
    server.close(() => {
      void close().then(() => process.exit(0));
    });
  });
