import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` must match the GitHub Pages repo name when deploying to
// https://USERNAME.github.io/portfolio/. Use "/" for a user/root site
// or a custom domain. Override via the BASE_PATH env var if needed.
const base = process.env.BASE_PATH ?? "/portfolio/";

export default defineConfig({
  base,
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
});
