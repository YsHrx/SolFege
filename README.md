# SolFège

Entraînement au solfège pour violonistes. Deux façons de s'en servir : suivre
un parcours, ou lancer un exercice à la carte.

Tout tourne dans le navigateur : pas de compte, pas de serveur, aucune donnée
qui sort de la machine. L'application s'installe et fonctionne hors ligne.

---

## Les deux modes

Un sélecteur en haut de l'accueil bascule de l'un à l'autre. Les deux
alimentent la même progression — XP, niveau, mémoire par note — mais seul le
mode Progression fait avancer le chemin.

### Progression

Un chemin d'unités qui se débloquent, corde par corde : les cordes à vide, la
corde de Sol, celle de Ré, le rythme, celle de La, celle de Mi, l'oreille, puis
toute la tessiture. Chaque unité se termine par un point d'étape qui mélange
ce qui précède.

On ne choisit ni exercice, ni difficulté, ni format : c'est l'avancement qui
élargit le sac de questions. Le tirage passe par une **répétition espacée** —
chaque note, valeur ou intervalle porte un poids qui tient compte de sa
fragilité, de sa nouveauté et du temps écoulé depuis la dernière rencontre. Ce
qu'on rate revient ; ce qui est acquis s'espace.

Un bouton **Renforcer mes points faibles** compose une leçon à partir des huit
items les plus ratés dès qu'il y a de quoi.

### Entraînement

Les mêmes exercices, à la carte, avec trois formats de partie :

| Format | Principe |
| --- | --- |
| **Série** | Un nombre de questions fixe. Les items ratés reviennent avant la fin. |
| **Contre-la-montre** | 60, 90 ou 120 secondes, un maximum de bonnes réponses. |
| **Mort subite** | Sans fin. La première erreur arrête tout, et le temps accordé par question se resserre à chaque réussite. |

Un record est tenu pour chaque combinaison exercice × format × difficulté.

---

## Les exercices

### Lecture de notes

Une note s'affiche sur la portée et se fait entendre au violon. On répond sur
sept touches, **au doigt ou au clavier** : `D R M F S L T` en notation
française, `C D E F G A B` en anglaise, `1` à `7` dans les deux cas, et Espace
pour réécouter.

| Difficulté | Étendue |
| --- | --- |
| Débutant | Les quatre cordes à vide et leurs voisines immédiates |
| Intermédiaire | Toute la première position, 4ᵉ doigt compris — Sol3 à Si5 |
| Avancé | Sol3 à Do7, la tessiture usuelle |

Trois régimes de chronomètre en format Série : **libre**, **fixe** (2 à 15 s),
et **adaptatif** — le temps se resserre de 0,25 s à chaque réussite et
s'élargit de 0,5 s à chaque erreur, entre 2 et 9 secondes. C'est celui qui fait
réellement progresser la vitesse de lecture.

### Lecture rythmique

Une pulsation régulière tourne à environ 97 à la noire. Une note de violon est
tenue sur sa durée réelle, deux fois de suite. Aucune autre valeur n'est
jouée : il s'agit de compter combien de temps elle occupe.

Débutant : ronde, blanche, noire. Intermédiaire : plus la noire pointée et la
croche. Avancé : plus la double-croche.

### Intervalles

Deux notes jouées successivement depuis une fondamentale tirée entre Ré4 et
La4. Débutant : unisson, quarte, quinte, octave. Intermédiaire : huit
intervalles. Avancé : les treize.

---

## La progression

**La série compte les jours** consécutifs où l'on a pratiqué, pas les sessions
parfaites. Un objectif quotidien réglable (1, 3 ou 5 leçons) remplit un anneau,
et un **gel de série** gagné toutes les dix leçons — deux en réserve au maximum
— couvre une journée manquée. Un calendrier du mois montre les jours pratiqués.

Une leçon rapporte de l'XP proportionnelle au score, plus un bonus de combo,
selon le même barème pour les trois exercices. Un niveau demande
`100 + (niveau − 1) × 60` XP.

**Trois fausses notes** par leçon : à la troisième erreur, la leçon s'arrête et
reste à refaire. La journée de pratique compte quand même. On peut couper cette
limite dans les réglages pour s'entraîner sans contrainte.

En fin de leçon, les notes manquées sont affichées **sur une mini-portée** —
savoir sur quoi on a buté est plus utile qu'un pourcentage. Une courbe de
précision par leçon est disponible dans les réglages.

Tout est stocké dans le `localStorage`, sous la clé `solfege_v5`. Une ancienne
sauvegarde `violin_trainer_state_v4` est reprise automatiquement. Les réglages
permettent d'exporter la progression en JSON, ou de tout effacer.

---

## Le son

Le violon entendu est un vrai violon, pas une synthèse. Quinze échantillons (La,
Do, Mi et Sol de chaque octave, de Sol3 à Do7) couvrent la tessiture ; les notes
intermédiaires sont obtenues en ajustant la vitesse de lecture, avec deux
demi-tons de transposition au maximum, ce qui reste juste à l'oreille.

Les fichiers pèsent 424 ko au total et sont servis depuis le site lui-même. Le
chargement est progressif : les quatre hauteurs les plus utilisées d'abord, le
reste en tâche de fond.

Deux filets de sécurité, dans cet ordre :

1. si `public/samples` est absent, les échantillons sont récupérés depuis un
   CDN public (requête partielle HTTP `Range`, pour ne télécharger que le début
   de chaque fichier) ;
2. si le réseau ne répond pas du tout, une synthèse intégrée prend le relais —
   trois dents de scie légèrement désaccordées, filtres formants aux résonances
   d'un violon, bruit d'archet, vibrato progressif. Moins beau, mais jouable.

Le métronome et l'animation de pulsation sont tous deux calés sur l'horloge
audio, jamais sur des minuteurs JavaScript : le tempo ne dérive pas, et les
pastilles ne décrochent pas du son.

---

## La direction artistique

Un cahier de musique : papier blanc cassé, encre noire, tout cerné d'un trait
de 2,5 px. **Aucun dégradé, aucune ombre floue** — uniquement des aplats et des
ombres pleines décalées, comme du papier découpé. Un grain de papier en
surimpression achève de retirer l'aspect vectoriel.

Le thème sombre n'est pas un « noir premium » mais une **ardoise** : tableau
noir, traits à la craie. Papier, ardoise ou celui du système, au choix.

La notation, elle, reste **gravée et juste** : les contours viennent de Bravura,
la police de référence SMuFL. L'élève doit reconnaître ce qu'il verra sur une
partition — le trait épais est porté par l'interface, pas par les notes.

La mascotte est une croche, avec six expressions.

---

## Développement

```sh
npm install
npm run dev      # serveur local
npm run build    # build de production dans dist/
npm run preview  # prévisualise le build
```

Aucune configuration, aucune variable d'environnement. Le résultat de `build`
est un site statique, déployable tel quel.

### Structure

```
src/
  App.jsx                routeur d'écrans, en-tête, sélecteur de mode
  index.css              jetons des deux thèmes, primitives, animations
  music/                 notes et manche, valeurs rythmiques, intervalles
  audio/useAudio.js      échantillons, synthèse de secours, métronome
  state/
    progress.js          sauvegarde v5, série en jours, XP, records
    srs.js               répétition espacée, tirage pondéré
  lesson/
    engine.js            moteur commun : formats, cœurs, file de reprise
    curriculum.js        le programme du mode Progression
  ui/
    notation.js          contours Bravura (produit par script)
    Glyphs.jsx           figures, silences, clef, portée
    Mascot.jsx           la croche, six expressions
    kit.jsx              boutons, cartes, jauges, combo, pluie de croches
    Curve.jsx            courbe de précision
  screens/               Path, Training, Lesson, Results, Settings
  exercises/             NoteReading, RhythmReading, IntervalEar
public/
  samples/               15 échantillons de violon (424 ko)
  fonts/                 Baloo 2 et IBM Plex, sous-ensemble latin
```

React 18, Vite 5, Tailwind 3, Web Audio API, `vite-plugin-pwa`. Les polices
sont auto-hébergées : aucune requête vers un CDN.

### Réglages rapides

| Ce qu'on veut changer | Où |
| --- | --- |
| Couleurs des deux thèmes | `src/index.css`, blocs `:root` |
| Notes de chaque difficulté | `src/music/notes.js`, `RANGES` |
| Le programme du chemin | `src/lesson/curriculum.js` |
| Valeurs rythmiques, intervalles | `src/music/rhythm.js`, `src/music/intervals.js` |
| Formats de partie | `src/lesson/engine.js`, `FORMATS` |
| Pondération de la répétition espacée | `src/state/srs.js`, `weightOf` |
| Courbe d'XP, série, gels | `src/state/progress.js` |

---

## Ce qui reste à faire

Voir [ROADMAP.md](ROADMAP.md). L'essentiel : de nouveaux formats d'exercice —
écrire la note sur la portée, lire une mesure entière, le doigté sur un manche
dessiné, et surtout **la justesse au micro**, qui est la fonctionnalité qui
distinguerait vraiment cet outil de ce qui existe déjà.

---

## Crédits et licence

Code sous licence MIT — voir [LICENSE](LICENSE). Échantillons, police de
notation et polices d'interface : voir [CREDITS.md](CREDITS.md).
