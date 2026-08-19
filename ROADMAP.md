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

- [x] ~~Jetons de thème : papier (clair) et ardoise (sombre), en variables CSS~~
- [x] ~~Polices auto-hébergées — Baloo 2 (titres) + IBM Plex Sans (texte), sous-ensemble latin~~
- [x] ~~Retirer la dépendance Google Fonts de `index.html`~~
- [x] ~~Figures de notes dessinées en SVG — ronde, blanche, noire, noire pointée, croche, double-croche~~
      *(corrige le défaut : blanche et noire rendues identiques par la police système)*
- [x] ~~Clef de sol dessinée en SVG, accrochée à la 2ᵉ ligne~~
- [x] ~~Portée redessinée : cadre ajusté, hampes qui rejoignent la ligne médiane, lignes supplémentaires propres~~
- [x] ~~Silences dessinés (pause, demi-pause, soupir, demi-soupir, quart de soupir)~~
- [x] ~~Primitives d'interface : bouton en relief, carte cernée, puce, ombres pleines~~
- [x] ~~Grain papier en surimpression~~
- [x] ~~Mascotte « la croche » — 6 expressions : repos, écoute, content, ravi, raté, endormi~~
- [x] ~~Bascule de thème papier / ardoise / système~~

## Phase 1 — Architecture

- [x] ~~Éclater `App.jsx` (1 625 lignes) en modules : `music/`, `audio/`, `state/`, `ui/`, `screens/`, `exercises/`~~
- [x] ~~Extraire le moteur audio dans `audio/useAudio.js`~~
- [x] ~~Schéma de sauvegarde v5 + migration sans perte depuis `violin_trainer_state_v4`~~
- [x] ~~Sélecteur Progression / Entraînement~~
- [x] ~~Écran de réglages : thème, notation, son, objectif du jour, cœurs, réinitialisation~~

## Phase 2 — Le moteur de leçon

- [x] ~~Moteur générique partagé par tous les exercices : file de questions, réponse, correction, avance~~
- [x] ~~Trois fausses notes (l'équivalent des cœurs) — icône corde qui casse, désactivable~~
- [x] ~~File de reprise : les items ratés reviennent en fin de leçon jusqu'à ce qu'ils passent~~
- [x] ~~Compteur de combo, bannière à 5, changement d'ambiance à 10~~
- [x] ~~Écran de fin en trois temps, avec les chiffres qui s'incrémentent en comptant~~
- [x] ~~Revue des erreurs en fin de leçon, sur mini-portée, avec « rejouer ces cinq-là »~~
- [x] ~~Barème d'XP unifié entre les trois modules~~ *(corrige : deux modules sur trois rapportaient moitié moins)*

## Phase 3 — Mode Entraînement

- [x] ~~Accueil du mode : les exercices en cartes, avec le record de chacun~~
- [x] ~~Porter la lecture de notes sur le nouveau moteur~~
- [x] ~~Porter la lecture rythmique~~
- [x] ~~Porter les intervalles~~
- [x] ~~**Format Série** — un nombre de questions fixe (le format actuel)~~
- [x] ~~**Format Contre-la-montre** — 60 / 90 / 120 s, maximum de bonnes réponses~~
- [x] ~~**Format Mort subite** — sans fin, s'arrête à la première erreur, la vitesse se resserre au fil des réussites~~
- [x] ~~Régimes de chrono pour la lecture de notes : libre, adaptatif, fixe~~
- [x] ~~Records par exercice × format × difficulté, affichés et battables~~
- [x] ~~Écran de fin propre à chaque format (temps tenu, meilleure série, notes/minute)~~

## Phase 4 — Mode Progression

- [x] ~~Programme : unités et leçons, corde par corde puis registre par registre~~
- [x] ~~Le chemin visuel qui serpente, nœuds verrouillés / en cours / acquis / en or~~
- [x] ~~Déverrouillage à l'avancement, points d'étape entre les unités~~
- [x] ~~Répétition espacée : compteurs par item (vu, raté, dernière fois), tirage 60 / 25 / 15~~
- [x] ~~Série en **jours** consécutifs~~ *(corrige : « série » désignait trois choses, dont une qui ne bougeait jamais)*
- [x] ~~Objectif du jour réglable (1 / 3 / 5 leçons) avec anneau de progression~~
- [x] ~~Gel de série — un jour de rattrapage gagné toutes les dix leçons~~
- [x] ~~Calendrier du mois avec les jours pratiqués~~
- [x] ~~Bouton « Renforcer mes points faibles » — une leçon bâtie sur les items les plus ratés~~
- [x] ~~Niveau légendaire : refaire une unité acquise sans erreur et au chrono, pour la passer en or~~
- [x] ~~Courbe de progression alimentée par l'historique~~ *(corrige : `history` était écrit et jamais lu)*

## Phase 5 — Nouveaux exercices

- [x] ~~**Écrire la note** — glisser une tête de note sur la portée~~
- [x] ~~**Lire une mesure** — quatre notes à la suite, réponse en rythme~~
- [x] ~~**Le doigté** — corde et doigt (0 à 4) sur un manche dessiné~~ *(propre au violon)*
- [x] ~~**Écouter et placer** — la note est jouée, pas affichée~~
- [x] ~~**Dictée de rythme** — taper le rythme entendu sur un gros bouton~~
- [x] ~~**La justesse au micro** — détection de hauteur par autocorrélation, curseur en cents~~ *(propre au violon)*
- [x] ~~**Chanter l'intervalle** — produire l'intervalle demandé, validé au micro~~
- [x] ~~**Armures et tonalités** — deux dièses → Ré majeur~~
- [x] ~~Altérations (dièses, bémols, bécarres) dans la lecture de notes~~
- [x] ~~Clef d'ut 3ᵉ ligne, pour l'alto~~

## Phase 6 — Animations

- [x] ~~Courbe à ressort `cubic-bezier(.34,1.56,.64,1)` sur tous les appuis~~
- [x] ~~Enfoncement du bouton en relief~~
- [x] ~~Pop de bonne réponse : la note grossit à 1,15 puis revient~~
- [x] ~~Secousse d'erreur : ±6 px, trois allers-retours, sur le bouton et la portée~~
- [x] ~~Barre de progression qui rebondit et flashe~~
- [x] ~~Chiffres qui comptent sur l'écran de fin~~
- [x] ~~Pluie de croches à la fin d'une leçon réussie~~
- [x] ~~Glissement horizontal entre deux questions~~
- [x] ~~Réactions de la mascotte~~
- [x] ~~Tout derrière `prefers-reduced-motion`~~

## Phase 7 — Finitions et correctifs de la revue

- [x] ~~Ajouter le Si5 aux notes de niveau intermédiaire~~ *(4ᵉ doigt sur la corde de Mi)*
- [x] ~~Clavier physique — `d r m f s l t`, `1`-`7`, Espace pour réécouter~~
- [x] ~~PWA réelle : service worker, icônes PNG 192 et 512, fonctionnement hors ligne~~
- [x] ~~Précharger les quinze échantillons, pas dix — et n'annoncer « prêt » qu'une fois la tessiture couverte~~
- [x] ~~Recaler l'animation de pulsation du module rythme sur l'horloge audio~~
- [x] ~~Accessibilité : équivalent textuel de la portée, `aria-live` sur les corrections, focus visible partout~~
- [x] ~~Réinitialiser la progression depuis les réglages~~
- [x] ~~Export et import de la progression en JSON~~
- [x] ~~Corriger l'écart `PARTIAL_BYTES` 80 ko / commentaire 70 ko~~
- [x] ~~Neutraliser le double déclenchement des effets sous `React.StrictMode` en développement~~
- [x] ~~Mettre le README à jour~~

---

## État

**Tout est fait.** Treize exercices, trois formats de partie, un chemin de
seize unités, trois clefs, trois positions de main gauche, et deux exercices
au micro dont un polyphonique.

## Ce qui a été ajouté après coup

Rien de ceci n'était dans la revue initiale.

- [x] ~~Deuxième et troisième positions sur le manche~~
- [x] ~~Doubles cordes : deux notes simultanées, à la justesse~~
- [x] ~~Lecture rythmique à plusieurs valeurs par mesure, avec silences~~
- [x] ~~Mesures composées (6/8, 9/8) et changements de tempo~~
- [x] ~~Import d'une progression exportée~~
- [x] ~~Choix du tempo de référence dans les réglages~~
- [x] ~~Diapason réglable (415–446 Hz), suivi par le jeu comme par le micro~~
- [x] ~~Exigence de justesse réglable, la zone verte faisant foi~~

## Relecture croisée (cinq revues indépendantes)

Une relecture complète du code, découpée en cinq lots — audio et micro,
moteur et état, exercices sans micro, notation et interface, cohérence
pédagogique. Ce qui suit est ce qu'elle a trouvé et ce qui a été corrigé.

### Corrections

- [x] ~~Micro laissé ouvert si l'exercice est quitté pendant la demande d'autorisation~~
- [x] ~~Délai d'abandon des exercices au micro compté depuis l'affichage, pas depuis l'ouverture du micro~~
- [x] ~~Note de référence programmée puis jamais annulée au changement de question~~
- [x] ~~Une sauvegarde importée corrompue faisait planter l'accueil et survivait au rechargement~~
- [x] ~~Un compteur non numérique en mémoire faisait poser la même question toute la leçon~~
- [x] ~~La réserve de gels de série se remplissait à l'infini : la série ne pouvait plus se rompre~~
- [x] ~~`onFinish` non figé : le contre-la-montre pouvait relancer son compte à rebours~~
- [x] ~~En 6/8 et 9/8, la majorité des motifs faisaient chevaucher une note sur la pulsation~~
- [x] ~~Repli du générateur de motifs faux en mesure composée (4,5 temps arrondis à 5)~~
- [x] ~~« Lire une mesure » n'alimentait jamais la mémoire par note qu'il consulte~~
- [x] ~~Lecture et écriture d'une note partageaient la même mémoire, chacune masquant l'autre~~
- [x] ~~Les altérations d'une armure se chevauchaient dès la deuxième~~
- [x] ~~La hampe d'un accord sortait de la carte sur les sixtes et les septièmes~~
- [x] ~~Hauteur de hampe d'accord négative au-delà de la septième~~
- [x] ~~Flash de thème clair à chaque ouverture en ardoise~~
- [x] ~~Aucune reprise après mise à jour : l'onglet ouvert gardait l'ancienne version~~
- [x] ~~Aucun bémol avant le niveau avancé, alors que Fa majeur s'enseigne très tôt~~
- [x] ~~Tolérance de frappe rythmique inatteignable au tempo maximal~~
- [x] ~~Boucle d'écoute de la dictée non arrêtée au changement de question~~
- [x] ~~Curseur du bouton bascule qui saute au lieu de glisser~~
- [x] ~~`color-scheme` absent : curseurs natifs à contre-thème~~
- [x] ~~Calendrier illisible au clavier et au lecteur d'écran~~

### Écarté

- Trois propositions seulement au premier niveau de lecture rythmique : il
  n'existe que trois valeurs à ce stade, et en ajouter une reviendrait à
  avancer la croche d'un palier pour une raison qui n'est pas pédagogique.
