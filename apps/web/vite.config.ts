import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: [
        "phasekit-logo.svg",
        "phasekit-logo-dark.svg",
        "phasekit-logo-light.svg",
        "fonts/**/*",
        "icons/**/*",
        "coverage.html",
      ],
      manifest: {
        id: "/",
        name: "PhaseKit",
        short_name: "PhaseKit",
        description: "Kylmäainetietopankki ja kylmäalan työkalut",
        lang: "fi",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#FAFEFF",
        background_color: "#FAFEFF",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,svg,png,woff2,ttf,txt}"],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: "/index.html",
      },
    }),
  ],
  build: { outDir: "dist", emptyOutDir: true },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
