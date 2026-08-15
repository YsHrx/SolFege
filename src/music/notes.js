/* ============================================================
   NOTES, PORTÉE ET MANCHE DU VIOLON
   ============================================================ */

export const NOTE_FR = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];
export const NOTE_EN = ["C", "D", "E", "F", "G", "A", "B"];
const SEMITONES = [0, 2, 4, 5, 7, 9, 11];

function build() {
  const t = [];
  for (let octave = 2; octave <= 7; octave++) {
    for (let i = 0; i < 7; i++) {
      t.push({
        step: i,
        name: NOTE_FR[i],
        nameEn: NOTE_EN[i],
        octave,
        midi: (octave + 1) * 12 + SEMITONES[i],
        diatonic: octave * 7 + i,
        label: NOTE_FR[i] + octave,
      });
    }
  }
  return t;
}

export const ALL_NOTES = build();

const BY_LABEL = new Map(ALL_NOTES.map((n) => [n.label, n]));
export const noteByLabel = (l) => BY_LABEL.get(l);
export const noteName = (note, notation) => (notation === "en" ? note.nameEn : note.name);

/* Position sur la portée en clé de sol, comptée en degrés depuis la ligne
   du bas (Mi4). 0 = ligne du bas, 8 = ligne du haut. */
const E4 = BY_LABEL.get("Mi4");
export const staffPosition = (note) => note.diatonic - E4.diatonic;

/* ============================================================
   LE MANCHE

   Quatre cordes à vide, et en première position quatre doigts par corde.
   Le 4e doigt d'une corde donne la même note que la corde à vide
   suivante — sauf sur le Mi, où il donne le Si5.

   C'est cette table qui définit la première position, plutôt qu'une
   liste de notes écrite à la main : impossible d'y oublier un doigt.
   ============================================================ */
export const STRINGS = [
  { id: "sol", label: "Sol", open: "Sol3", color: "var(--brick)" },
  { id: "re", label: "Ré", open: "Ré4", color: "var(--mustard)" },
  { id: "la", label: "La", open: "La4", color: "var(--moss)" },
  { id: "mi", label: "Mi", open: "Mi5", color: "var(--blue)" },
];

/* Les quatre doigts de la première position, en degrés diatoniques
   au-dessus de la corde à vide. */
const FIRST_POSITION_FINGERS = [1, 2, 3, 4];

/** Toutes les notes atteignables en première position, corde par corde. */
export function firstPositionByString() {
  return STRINGS.map((s) => {
    const open = BY_LABEL.get(s.open);
    const notes = [open];
    for (const f of FIRST_POSITION_FINGERS) {
      notes.push(ALL_NOTES.find((n) => n.diatonic === open.diatonic + f));
    }
    return { ...s, openNote: open, notes };
  });
}

/** Où jouer une note en première position : corde et doigt. */
export function fingeringFor(note) {
  const out = [];
  for (const s of firstPositionByString()) {
    const i = s.notes.findIndex((n) => n.label === note.label);
    if (i >= 0) out.push({ string: s.id, stringLabel: s.label, finger: i });
  }
  return out;
}

/* ============================================================
   TESSITURES

   Les trois paliers historiques restent disponibles dans le mode
   Entraînement. Le mode Progression, lui, tire ses notes du programme.
   ============================================================ */
const uniq = (labels) => [...new Set(labels)].map((l) => BY_LABEL.get(l)).filter(Boolean);

// cordes à vide et leurs deux voisines immédiates
const DEBUTANT = uniq([
  "Sol3", "La3", "Si3",
  "Ré4", "Mi4", "Fa4",
  "La4", "Si4", "Do5",
  "Mi5", "Fa5", "Sol5",
]);

// toute la première position, 4e doigt compris — dérivée du manche
const INTERMEDIAIRE = uniq(
  firstPositionByString().flatMap((s) => s.notes.map((n) => n.label))
);

// la tessiture usuelle de l'instrument
const AVANCE = ALL_NOTES.filter(
  (n) => n.midi >= BY_LABEL.get("Sol3").midi && n.midi <= BY_LABEL.get("Do7").midi
);

export const RANGES = {
  debutant: {
    label: "Débutant",
    notes: DEBUTANT,
    hint: "Les quatre cordes à vide et leurs voisines immédiates",
  },
  intermediaire: {
    label: "Intermédiaire",
    notes: INTERMEDIAIRE,
    hint: "Toute la première position, 4e doigt compris",
  },
  avance: {
    label: "Avancé",
    notes: AVANCE,
    hint: "Toute la tessiture usuelle du violon",
  },
};

export const DIFFICULTIES = ["debutant", "intermediaire", "avance"];

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
