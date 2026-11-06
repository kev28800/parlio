import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    fs: {
      strict: true,
      // Le serveur de développement ne doit jamais servir la base des comptes.
      deny: [
        ".env",
        ".env.*",
        "*.{crt,pem}",
        "**/.git/**",
        "**/data/**",
        "**/*.sqlite",
        "**/*.sqlite-*",
        "**/*.sqlite3",
        "**/*.db",
        "**/*.db-*",
        "**/server/**",
        "**/api/**",
        "**/netlify/**",
        "**/.vercel/**",
        "**/tests/**",
      ],
    },
  },
});
