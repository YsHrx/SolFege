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

/* ============================================================
   CLEFS

   Une clef, c'est une équivalence entre un degré diatonique et une
   position sur la portée. Tout le reste s'en déduit — d'où ce petit
   tableau plutôt qu'une formule figée sur la clé de sol.

   `origin` est la position où se pose le point d'ancrage SMuFL du
   signe : la ligne de Sol pour la clef de sol, la ligne désignée pour
   les clefs d'ut et de fa.
   ============================================================ */
export const CLEFS = {
  sol: {
    id: "sol", label: "Clé de sol", glyph: "gClef",
    ref: "Mi4", refPosition: 0, origin: 2,
  },
  ut3: {
    id: "ut3", label: "Clé d'ut 3e", glyph: "cClef",
    ref: "Do4", refPosition: 4, origin: 4,
  },
  fa: {
    id: "fa", label: "Clé de fa", glyph: "fClef",
    ref: "Sol2", refPosition: 0, origin: 6,
  },
};

/* Position sur la portée, en degrés depuis la ligne du bas.
   0 = ligne du bas, 8 = ligne du haut. */
export function staffPositionIn(note, clefId = "sol") {
  const c = CLEFS[clefId] || CLEFS.sol;
  return note.diatonic - BY_LABEL.get(c.ref).diatonic + c.refPosition;
}

/** Raccourci pour la clé de sol, de loin la plus utilisée ici. */
export const staffPosition = (note) => staffPositionIn(note, "sol");

/** La note qui occupe un degré donné, dans une clef donnée. */
export function noteAtPosition(position, clefId = "sol") {
  const c = CLEFS[clefId] || CLEFS.sol;
  const diatonic = position - c.refPosition + BY_LABEL.get(c.ref).diatonic;
  return ALL_NOTES.find((n) => n.diatonic === diatonic) || null;
}

/* ============================================================
   ALTÉRATIONS

   Une hauteur altérée, c'est un degré diatonique plus un décalage :
   −1 bémol, 0 bécarre, +1 dièse. On garde le degré séparé du décalage
   parce que c'est ainsi que ça se lit sur une portée — le Do♯ et le
   Ré♭ sonnent pareil mais ne s'écrivent pas au même endroit.
   ============================================================ */
export const ALTERATIONS = [
  { alt: -1, sign: "b", glyph: "accidentalFlat", label: "bémol", suffix: "♭" },
  { alt: 0, sign: "n", glyph: "accidentalNatural", label: "bécarre", suffix: "♮" },
  { alt: 1, sign: "#", glyph: "accidentalSharp", label: "dièse", suffix: "♯" },
];

export const makePitch = (note, alt = 0) => ({ note, alt });
export const pitchMidi = (p) => p.note.midi + p.alt;
export const pitchKey = (p) => `${p.note.label}${p.alt > 0 ? "#" : p.alt < 0 ? "b" : ""}`;
export const pitchSign = (p) => (p.alt > 0 ? "#" : p.alt < 0 ? "b" : null);

export function pitchName(p, notation) {
  const base = noteName(p.note, notation);
  return base + (p.alt > 0 ? "♯" : p.alt < 0 ? "♭" : "");
}

/* Les degrés qui portent une altération dans la musique tonale : on
   n'écrit ni Mi♯ ni Fa♭ dans un exercice d'initiation, ils existent mais
   n'apprennent rien d'utile ici. */
const SHARPABLE = [0, 1, 3, 4, 5];   // Do Ré Fa Sol La
const FLATABLE = [1, 2, 4, 5, 6];    // Ré Mi Sol La Si

/** Développe une liste de notes en hauteurs altérées jouables. */
export function withAlterations(notes, { sharps = true, flats = true } = {}) {
  const out = notes.map((n) => makePitch(n, 0));
  for (const n of notes) {
    if (sharps && SHARPABLE.includes(n.step)) out.push(makePitch(n, 1));
    if (flats && FLATABLE.includes(n.step)) out.push(makePitch(n, -1));
  }
  return out;
}

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

/* Les positions du violon, exprimées en degrés diatoniques : la
   première position pose le 1er doigt un degré au-dessus de la corde à
   vide, la deuxième deux degrés, la troisième trois. C'est une
   simplification — les positions se comptent en demi-tons et la
   deuxième a des variantes — mais elle correspond à ce qu'on enseigne
   d'abord, et elle se lit sans ambiguïté sur une portée. */
export const POSITIONS = [
  { id: 1, label: "1re position", shift: 0 },
  { id: 2, label: "2e position", shift: 1 },
  { id: 3, label: "3e position", shift: 2 },
];

const FINGERS = [1, 2, 3, 4];

/** Les notes atteignables dans une position donnée, corde par corde. */
export function positionByString(position = 1) {
  const p = POSITIONS.find((x) => x.id === position) || POSITIONS[0];
  return STRINGS.map((s) => {
    const open = BY_LABEL.get(s.open);
    const notes = [open];
    for (const f of FINGERS) {
      notes.push(ALL_NOTES.find((n) => n.diatonic === open.diatonic + f + p.shift));
    }
    return { ...s, openNote: open, notes, position: p.id };
  });
}

/** Raccourci historique : la première position. */
export const firstPositionByString = () => positionByString(1);

/** Où jouer une note dans une position : corde et doigt. */
export function fingeringFor(note, position = 1) {
  const out = [];
  for (const s of positionByString(position)) {
    const i = s.notes.findIndex((n) => n && n.label === note.label);
    if (i >= 0) out.push({ string: s.id, stringLabel: s.label, finger: i, position });
  }
  return out;
}

/* ============================================================
   DOUBLES CORDES

   Deux notes jouées ensemble sur deux cordes voisines. On se limite aux
   couples réellement tenables : cordes adjacentes, et un écart de doigts
   qui ne demande pas d'extension.
   ============================================================ */
export function doubleStops(position = 1) {
  const strings = positionByString(position);
  const out = [];
  for (let i = 0; i < strings.length - 1; i++) {
    const low = strings[i];
    const high = strings[i + 1];
    for (let a = 0; a < low.notes.length; a++) {
      for (let b = 0; b < high.notes.length; b++) {
        if (!low.notes[a] || !high.notes[b]) continue;
        // un doigt sur chaque corde, ou une corde à vide : au-delà de
        // deux crans d'écart, la main ne suit pas
        if (a > 0 && b > 0 && Math.abs(a - b) > 2) continue;
        out.push({
          low: low.notes[a], high: high.notes[b],
          lowString: low.id, highString: high.id,
          lowFinger: a, highFinger: b,
        });
      }
    }
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

/* ============================================================
   TESSITURES PAR CLEF

   Lire la tessiture du violon en clé d'ut placerait toutes les notes
   au-dessus de la portée : l'exercice serait illisible et sans intérêt.
   Chaque clef a donc son instrument — alto pour l'ut 3e, violoncelle
   pour la clé de fa — avec les mêmes trois paliers.
   ============================================================ */
const between = (a, b) => {
  const lo = BY_LABEL.get(a).midi;
  const hi = BY_LABEL.get(b).midi;
  return ALL_NOTES.filter((n) => n.midi >= lo && n.midi <= hi);
};

export const RANGES_BY_CLEF = {
  sol: RANGES,
  ut3: {
    debutant: {
      label: "Débutant", notes: between("Do3", "La4"),
      hint: "Les cordes de l'alto, autour de la portée",
    },
    intermediaire: {
      label: "Intermédiaire", notes: between("Do3", "Mi5"),
      hint: "La première position de l'alto",
    },
    avance: {
      label: "Avancé", notes: between("Do3", "La5"),
      hint: "La tessiture usuelle de l'alto",
    },
  },
  fa: {
    debutant: {
      label: "Débutant", notes: between("Do2", "Ré3"),
      hint: "Les cordes graves, autour de la portée",
    },
    intermediaire: {
      label: "Intermédiaire", notes: between("Do2", "La3"),
      hint: "La première position du violoncelle",
    },
    avance: {
      label: "Avancé", notes: between("Do2", "Mi4"),
      hint: "La tessiture usuelle du violoncelle",
    },
  },
};

export const rangesFor = (clef = "sol") => RANGES_BY_CLEF[clef] || RANGES;

/* ============================================================
   DIAPASON

   Le La3 de référence n'est pas toujours à 440 Hz : beaucoup
   d'orchestres et de violonistes accordent à 442, et la musique
   ancienne descend à 415. Toute fréquence calculée dans l'application
   part donc de ce réglage — la note jouée comme la note attendue au
   micro. Sans quoi un instrument accordé à 442 serait déclaré faux de
   huit cents sur chaque note.
   ============================================================ */
export const A4_DEFAULT = 440;
export const A4_RANGE = { min: 415, max: 446 };

export const midiToFreq = (m, a4 = A4_DEFAULT) => a4 * Math.pow(2, (m - 69) / 12);
