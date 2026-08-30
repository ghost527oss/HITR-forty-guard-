import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite dev server proxies /api to the FastAPI backend so the browser never
// talks to a hardcoded origin. Set VITE_API_TARGET or default to :8000.
export default defineConfig({
  plugins: [react()],
  // Vercel + Python (`api/index.py`) looks for static files at repo-root
  // `public/` (or outputDirectory). Building into frontend/dist made Vercel
  // report "no index.html" and serve the git root instead — blank site.
  build: {
    outDir: path.resolve(__dirname, "../public"),
    emptyOutDir: true,
  },
  test: {
    // uhiFactors is pure TypeScript — no DOM needed, and jsdom would slow it down.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: [".e2b.app", "localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
