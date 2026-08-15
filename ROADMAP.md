# Feuille de route — refonte SolFège

Refonte complète : nouvelle direction artistique « cahier de musique », système
d'apprentissage façon Duolingo, et deux modes cohabitant derrière un sélecteur.

Les lignes ~~barrées~~ sont terminées. Chaque phase laisse l'application dans un
état fonctionnel : on peut s'arrêter à la fin de n'importe laquelle.

---

## Les deux modes

Un sélecteur en haut de l'écran d'accueil bascule entre :

- **Progression** — le chemin d'unités qui se débloquent, la série en jours,
  la répétition espacée. On suit un parcours, on ne choisit rien.
- **Entraînement** — les exercices lancés à la carte, sans parcours. On choisit
  l'exercice, la difficulté et le format de partie. Pour travailler un point
  précis ou battre un record.

Les deux alimentent la même progression (XP, niveau, statistiques par note),
mais seul le mode Progression fait avancer le chemin.

---

## Phase 0 — La direction artistique

- [ ] Jetons de thème : papier (clair) et ardoise (sombre), en variables CSS
- [ ] Polices auto-hébergées — Baloo 2 (titres) + IBM Plex Sans (texte), sous-ensemble latin
- [ ] Retirer la dépendance Google Fonts de `index.html`
- [ ] Figures de notes dessinées en SVG — ronde, blanche, noire, noire pointée, croche, double-croche
      *(corrige le défaut : blanche et noire rendues identiques par la police système)*
- [ ] Clef de sol dessinée en SVG, accrochée à la 2ᵉ ligne
- [ ] Portée redessinée : cadre ajusté, hampes qui rejoignent la ligne médiane, lignes supplémentaires propres
- [ ] Silences dessinés (pause, demi-pause, soupir, demi-soupir, quart de soupir)
- [ ] Primitives d'interface : bouton en relief, carte cernée, puce, ombres pleines
- [ ] Grain papier en surimpression
- [ ] Mascotte « la croche » — 6 expressions : repos, écoute, content, ravi, raté, endormi
- [ ] Bascule de thème papier / ardoise / système

## Phase 1 — Architecture

- [ ] Éclater `App.jsx` (1 625 lignes) en modules : `music/`, `audio/`, `state/`, `ui/`, `screens/`, `exercises/`
- [ ] Extraire le moteur audio dans `audio/useAudio.js`
- [ ] Schéma de sauvegarde v5 + migration sans perte depuis `violin_trainer_state_v4`
- [ ] Sélecteur Progression / Entraînement
- [ ] Écran de réglages : thème, notation, son, objectif du jour, cœurs, réinitialisation

## Phase 2 — Le moteur de leçon

- [ ] Moteur générique partagé par tous les exercices : file de questions, réponse, correction, avance
- [ ] Trois fausses notes (l'équivalent des cœurs) — icône corde qui casse, désactivable
- [ ] File de reprise : les items ratés reviennent en fin de leçon jusqu'à ce qu'ils passent
- [ ] Compteur de combo, bannière à 5, changement d'ambiance à 10
- [ ] Écran de fin en trois temps, avec les chiffres qui s'incrémentent en comptant
- [ ] Revue des erreurs en fin de leçon, sur mini-portée, avec « rejouer ces cinq-là »
- [ ] Barème d'XP unifié entre les trois modules *(corrige : deux modules sur trois rapportaient moitié moins)*

## Phase 3 — Mode Entraînement

- [ ] Accueil du mode : les exercices en cartes, avec le record de chacun
- [ ] Porter la lecture de notes sur le nouveau moteur
- [ ] Porter la lecture rythmique
- [ ] Porter les intervalles
- [ ] **Format Série** — un nombre de questions fixe (le format actuel)
- [ ] **Format Contre-la-montre** — 60 / 90 / 120 s, maximum de bonnes réponses
- [ ] **Format Mort subite** — sans fin, s'arrête à la première erreur, la vitesse se resserre au fil des réussites
- [ ] Régimes de chrono pour la lecture de notes : libre, adaptatif, fixe
- [ ] Records par exercice × format × difficulté, affichés et battables
- [ ] Écran de fin propre à chaque format (temps tenu, meilleure série, notes/minute)

## Phase 4 — Mode Progression

- [ ] Programme : unités et leçons, corde par corde puis registre par registre
- [ ] Le chemin visuel qui serpente, nœuds verrouillés / en cours / acquis / en or
- [ ] Déverrouillage à l'avancement, points d'étape entre les unités
- [ ] Répétition espacée : compteurs par item (vu, raté, dernière fois), tirage 60 / 25 / 15
- [ ] Série en **jours** consécutifs *(corrige : « série » désignait trois choses, dont une qui ne bougeait jamais)*
- [ ] Objectif du jour réglable (1 / 3 / 5 leçons) avec anneau de progression
- [ ] Gel de série — un jour de rattrapage gagné toutes les dix leçons
- [ ] Calendrier du mois avec les jours pratiqués
- [ ] Bouton « Renforcer mes points faibles » — une leçon bâtie sur les items les plus ratés
- [ ] Niveau légendaire : refaire une unité acquise sans erreur et au chrono, pour la passer en or
- [ ] Courbe de progression alimentée par l'historique *(corrige : `history` était écrit et jamais lu)*

## Phase 5 — Nouveaux exercices

- [ ] **Écrire la note** — glisser une tête de note sur la portée
- [ ] **Lire une mesure** — quatre notes à la suite, réponse en rythme
- [ ] **Le doigté** — corde et doigt (0 à 4) sur un manche dessiné *(propre au violon)*
- [ ] **Écouter et placer** — la note est jouée, pas affichée
- [ ] **Dictée de rythme** — taper le rythme entendu sur un gros bouton
- [ ] **La justesse au micro** — détection de hauteur par autocorrélation, curseur en cents *(propre au violon)*
- [ ] **Chanter l'intervalle** — produire l'intervalle demandé, validé au micro
- [ ] **Armures et tonalités** — deux dièses → Ré majeur
- [ ] Altérations (dièses, bémols, bécarres) dans la lecture de notes
- [ ] Clef d'ut 3ᵉ ligne, pour l'alto

## Phase 6 — Animations

- [ ] Courbe à ressort `cubic-bezier(.34,1.56,.64,1)` sur tous les appuis
- [ ] Enfoncement du bouton en relief
- [ ] Pop de bonne réponse : la note grossit à 1,15 puis revient
- [ ] Secousse d'erreur : ±6 px, trois allers-retours, sur le bouton et la portée
- [ ] Barre de progression qui rebondit et flashe
- [ ] Chiffres qui comptent sur l'écran de fin
- [ ] Pluie de croches à la fin d'une leçon réussie
- [ ] Glissement horizontal entre deux questions
- [ ] Réactions de la mascotte
- [ ] Tout derrière `prefers-reduced-motion`

## Phase 7 — Finitions et correctifs de la revue

- [x] ~~Ajouter le Si5 aux notes de niveau intermédiaire~~ *(4ᵉ doigt sur la corde de Mi)*
- [ ] Clavier physique — `d r m f s l t`, `1`-`7`, Espace pour réécouter
- [ ] PWA réelle : service worker, icônes PNG 192 et 512, fonctionnement hors ligne
- [ ] Précharger les quinze échantillons, pas dix — et n'annoncer « prêt » qu'une fois la tessiture couverte
- [ ] Recaler l'animation de pulsation du module rythme sur l'horloge audio
- [ ] Accessibilité : équivalent textuel de la portée, `aria-live` sur les corrections, focus visible partout
- [ ] Réinitialiser la progression depuis les réglages
- [ ] Export et import de la progression en JSON
- [ ] Corriger l'écart `PARTIAL_BYTES` 80 ko / commentaire 70 ko
- [ ] Neutraliser le double déclenchement des effets sous `React.StrictMode` en développement
- [ ] Mettre le README à jour

---

## Ordre d'exécution

Les phases 0 à 3 forment un premier ensemble livrable : nouvelle direction
artistique, mode Entraînement complet avec ses trois formats de partie, les
trois exercices existants portés. La phase 4 ajoute le mode Progression, la
phase 5 étoffe le contenu, les phases 6 et 7 polissent.
