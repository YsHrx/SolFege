import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

/* L'application est entièrement statique et pèse moins de deux mégaoctets,
   échantillons de violon compris : tout peut être mis en cache. C'est ce qui
   permet de travailler son solfège dans le métro — l'usage le plus probable
   d'une application de ce genre. */
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png"],
      workbox: {
        // les mp3 et les woff2 ne sont pas dans la liste par défaut
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,mp3,webmanifest}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: "SolFège — entraînement violon",
        short_name: "SolFège",
        description:
          "Entraînement au solfège pour violonistes : un chemin d'apprentissage et des exercices à la carte.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#fbf7ea",
        theme_color: "#fbf7ea",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
    }),
  ],
});
