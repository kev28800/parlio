import { createServerlessHandler } from "../server/serverless.js";

// Vercel transmet l'URL d'origine à Express via la réécriture /api/:path*.
export default createServerlessHandler();
