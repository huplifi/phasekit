import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath } from "node:url";
import packageInfo from "../../package.json" with { type: "json" };
const isBetaBuild =
  packageInfo.version.includes("-beta.") ||
  process.env.VITE_RELEASE_CHANNEL === "beta";
const appName = isBetaBuild ? "PhaseKit Beta" : "PhaseKit";
const iconPrefix = isBetaBuild ? "/icons/icon-beta" : "/icons/icon";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  define: {
    "import.meta.env.VITE_BUILD_REVISION": JSON.stringify(
      process.env.COMMIT_REF?.slice(0, 7) || "development",
    ),
  },
  plugins: [
    react(),
    {
      name: "phasekit-install-identity",
      transformIndexHtml(html) {
        if (!isBetaBuild) return html;
        return html
          .replace("/icons/icon-192.png", "/icons/icon-beta-180.png")
          .replace(
            "</head>",
            '<meta name="apple-mobile-web-app-title" content="PhaseKit Beta"/></head>',
          );
      },
    },
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
        name: appName,
        short_name: appName,
        description: "Kylmäainetietopankki ja kylmäalan työkalut",
        lang: "fi",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#FAFEFF",
        background_color: "#FAFEFF",
        icons: [
          { src: `${iconPrefix}-192.png`, sizes: "192x192", type: "image/png" },
          { src: `${iconPrefix}-512.png`, sizes: "512x512", type: "image/png" },
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
