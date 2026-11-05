import { build } from "esbuild";

// Le serveur livré n'a besoin ni de tsx, ni de Vite, ni des sources TypeScript.
await build({
  entryPoints: ["server/index.ts"],
  outfile: "build/server/index.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  target: "node24",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  logLevel: "info",
});
