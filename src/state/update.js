/* ============================================================
   MISE À JOUR DE L'APPLICATION

   Le service worker s'installe tout seul et prend la main aussitôt
   (`autoUpdate`). Mais l'onglet déjà ouvert, lui, continue de faire
   tourner l'ancien code en mémoire : une application installée qu'on
   laisse dormir en arrière-plan peut rester des jours sur une version
   périmée, avec un cache qui, lui, a changé.

   On recharge donc — mais jamais au milieu d'une leçon. Le rechargement
   attend un moment où il ne coûte rien : l'écran d'accueil, ou le retour
   sur l'application après l'avoir quittée des yeux.
   ============================================================ */

let pending = false;

export function watchForUpdate() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    pending = true;
  });
  document.addEventListener("visibilitychange", () => {
    if (pending && document.visibilityState === "visible") applyUpdate();
  });
}

/** À appeler quand l'écran courant peut disparaître sans rien perdre. */
export function applyUpdateIfIdle() {
  if (pending) applyUpdate();
}

function applyUpdate() {
  pending = false;
  window.location.reload();
}
