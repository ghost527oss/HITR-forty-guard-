import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server proxies /api to the FastAPI backend so the browser never
// talks to a hardcoded origin. Set VITE_API_TARGET or default to :8000.
export default defineConfig({
  plugins: [react()],
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
