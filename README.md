# SolFège

Entraînement au solfège pour violonistes. Trois exercices courts — lecture de
notes, lecture rythmique, reconnaissance d'intervalles — jouables en quelques
minutes, au clavier ou au doigt.

Tout tourne dans le navigateur : pas de compte, pas de serveur, aucune donnée
qui sort de la machine. La progression est enregistrée en local.

---

## Les trois modules

### Lecture de notes — 20 questions

Une note s'affiche sur la portée en clé de sol et se fait entendre au violon.
On répond sur un clavier de sept touches. En cas d'erreur, la touche fautive
passe au rouge et la bonne réponse au vert.

La difficulté détermine l'étendue tirée au sort :

| Niveau | Étendue | Notes |
| --- | --- | --- |
| Débutant | Sol3 → Sol5 | Les quatre cordes à vide et leurs voisines immédiates (12 notes) |
| Intermédiaire | Sol3 → La5 | Toute la première position (16 notes) |
| Avancé | Sol3 → Do7 | La tessiture usuelle de l'instrument |

Trois régimes de chronomètre, propres à ce module :

- **Libre** — aucune limite, la note suivante arrive dès la réponse.
- **Adaptatif** — le temps se resserre de 0,25 s à chaque réussite et
  s'élargit de 0,5 s à chaque erreur, entre 2 et 9 secondes. C'est le mode
  qui fait réellement progresser la vitesse de lecture.
- **Fixe** — de 2 à 15 secondes, identique à chaque note.

### Lecture rythmique — 12 questions

Une pulsation régulière tourne à environ 97 BPM. Une note de violon est tenue
sur sa durée réelle, deux fois de suite. Il n'y a aucune autre valeur jouée :
il s'agit uniquement de compter combien de temps la note occupe par rapport à
la pulsation.

| Niveau | Valeurs testées |
| --- | --- |
| Débutant | Ronde, blanche, noire |
| Intermédiaire | + noire pointée, croche |
| Avancé | + double-croche |

### Intervalles — 12 questions

Deux notes jouées successivement, à partir d'une fondamentale tirée entre Ré4
et La4. On nomme l'intervalle.

| Niveau | Intervalles |
| --- | --- |
| Débutant | Unisson, quarte juste, quinte juste, octave |
| Intermédiaire | 8 intervalles, dont tierces et sixtes |
| Avancé | Les 13, de l'unisson à l'octave |

---

## Progression

Chaque session terminée rapporte de l'XP proportionnelle au score, plus un
bonus de série. Une session abandonnée compte à moitié, ne rapporte pas de
bonus et ne casse pas la série en cours : quitter en route n'est pas puni.

Un niveau demande `100 + (niveau − 1) × 60` XP. La série compte les sessions
parfaites d'affilée. Le taux de réussite par module est affiché sur l'accueil.

Tout est stocké dans le `localStorage` du navigateur, sous la clé
`violin_trainer_state_v4`. Vider les données du site remet le compteur à zéro ;
la progression ne suit pas d'un appareil à l'autre.

---

## Le son

Le violon entendu est un vrai violon, pas une synthèse. Quinze échantillons
(La, Do, Mi et Sol de chaque octave, de Sol3 à Do7) couvrent la tessiture ; les
notes intermédiaires sont obtenues en ajustant la vitesse de lecture, avec deux
demi-tons de transposition au maximum, ce qui reste juste à l'oreille.

Les fichiers pèsent 424 ko au total et sont servis depuis le site lui-même. Le
chargement est progressif : les quatre hauteurs les plus utilisées d'abord, le
reste en tâche de fond. L'indicateur en bas de l'accueil dit où en est le
chargement.

Deux filets de sécurité, dans cet ordre :

1. si `public/samples` est absent, les échantillons sont récupérés depuis un
   CDN public (requête partielle HTTP `Range`, pour ne télécharger que le début
   de chaque fichier) ;
2. si le réseau ne répond pas du tout, une synthèse intégrée prend le relais —
   trois dents de scie légèrement désaccordées, filtres formants aux résonances
   d'un violon, bruit d'archet, vibrato progressif. Moins beau, mais jouable.

Le métronome du module rythmique est programmé sur l'horloge audio et non sur
des minuteurs JavaScript : le tempo ne dérive pas.

---

## Développement

```sh
npm install
npm run dev      # serveur local
npm run build    # build de production dans dist/
npm run preview  # prévisualise le build
```

Aucune configuration, aucune variable d'environnement. Le résultat de `build`
est un site statique, déployable tel quel sur n'importe quel hébergeur.

### Structure

```
index.html                    page hôte, polices, manifeste PWA
src/App.jsx                   toute l'application
src/main.jsx                  point d'entrée React
src/index.css                 directives Tailwind
public/samples/               15 échantillons de violon (424 ko)
public/icon.svg               icône
public/manifest.webmanifest   installable sur mobile
```

React 18, Vite 5, Tailwind 3, Web Audio API. Pas d'autre dépendance à
l'exécution ; les polices viennent de Google Fonts.

### Réglages rapides

Tout est en haut de `src/App.jsx` :

| Ce qu'on veut changer | Où |
| --- | --- |
| Palette de couleurs | objet `C` |
| Notes de chaque difficulté | `DEBUTANT_LABELS`, `INTERMEDIAIRE_LABELS`, `AVANCE_LABELS` |
| Valeurs rythmiques et intervalles testés | `RHYTHM_POOL`, `INTERVAL_POOL` |
| Nombre de questions par session | `NOTES_TOTAL`, `RHYTHM_TOTAL`, `INTERVAL_TOTAL` |
| Tempo du module rythmique | `BEAT_MS` |
| Courbe d'XP | `xpForLevel` |

---

## À faire

Le module de justesse au micro n'existe pas encore. Il s'agirait de capter le
violon via `getUserMedia`, de détecter la hauteur par autocorrélation et de la
comparer à la note demandée. C'est la fonctionnalité qui distinguerait
vraiment cet outil de ce qui existe déjà.

Autres pistes : altérations et armures, clé d'ut, intervalles harmoniques
(deux notes simultanées), export de la progression.

---

## Crédits et licence

Code sous licence MIT — voir [LICENSE](LICENSE).

Les échantillons de violon proviennent de la **Versilian Studios Chamber
Orchestra 2 — Community Edition**, redistribués via
[tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) et
placés sous licence
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Ils ont été
raccourcis et ré-encodés pour l'usage web ; toute réutilisation doit conserver
cette attribution.
