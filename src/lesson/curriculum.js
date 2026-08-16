import { ALL_NOTES, noteByLabel, firstPositionByString } from "../music/notes.js";

/* ============================================================
   LE PROGRAMME

   Le mode Progression ne propose ni difficulté ni réglage : c'est
   l'avancement qui élargit le sac de questions. On suit les cordes une
   à une, comme on apprend l'instrument, et le rythme et l'oreille
   s'intercalent pour éviter huit unités de lecture d'affilée.

   Une unité se termine par un point d'étape qui mélange tout ce qui
   précède : c'est là que la répétition espacée sert vraiment.
   ============================================================ */

const L = (labels) => labels.map(noteByLabel).filter(Boolean);

const byString = firstPositionByString();
const stringNotes = (id) => byString.find((s) => s.id === id).notes;
const OPEN = L(["Sol3", "Ré4", "La4", "Mi5"]);

const upTo = (a, b) => {
  const lo = noteByLabel(a).midi, hi = noteByLabel(b).midi;
  return ALL_NOTES.filter((n) => n.midi >= lo && n.midi <= hi);
};

/** Réunit plusieurs listes de notes sans doublon. */
const merge = (...lists) => {
  const seen = new Set();
  const out = [];
  for (const l of lists) for (const n of l) {
    if (!seen.has(n.label)) { seen.add(n.label); out.push(n); }
  }
  return out;
};

export const UNITS = [
  {
    id: "u1",
    title: "Les cordes à vide",
    hint: "Les quatre repères de l'instrument",
    tone: "var(--blue)",
    lessons: [
      { id: "u1l1", title: "Sol, Ré, La, Mi", exercise: "notes", pool: OPEN, total: 8 },
      { id: "u1l2", title: "Les mêmes, plus vite", exercise: "notes", pool: OPEN, total: 10, timerMode: "adaptatif" },
      { id: "u1l3", title: "Ronde, blanche, noire", exercise: "rythme", difficulty: "debutant", total: 8 },
      { id: "u1l4", title: "Point d'étape", exercise: "notes", pool: OPEN, total: 12, timerMode: "adaptatif", checkpoint: true },
    ],
  },
  {
    id: "u2",
    title: "La corde de Sol",
    hint: "Les quatre doigts sur la corde grave",
    tone: "var(--brick)",
    lessons: [
      { id: "u2l1", title: "Sol, La, Si", exercise: "notes", pool: L(["Sol3", "La3", "Si3"]), total: 8 },
      { id: "u2l2", title: "Do et Ré", exercise: "notes", pool: L(["Si3", "Do4", "Ré4"]), total: 8 },
      { id: "u2l3", title: "Toute la corde", exercise: "notes", pool: merge(stringNotes("sol"), OPEN), total: 12 },
      { id: "u2l4", title: "Point d'étape", exercise: "notes", pool: merge(stringNotes("sol"), OPEN), total: 12, timerMode: "adaptatif", checkpoint: true },
    ],
  },
  {
    id: "u3",
    title: "La corde de Ré",
    hint: "On monte d'une corde",
    tone: "var(--mustard)",
    lessons: [
      { id: "u3l1", title: "Ré, Mi, Fa", exercise: "notes", pool: L(["Ré4", "Mi4", "Fa4"]), total: 8 },
      { id: "u3l2", title: "Sol et La", exercise: "notes", pool: L(["Fa4", "Sol4", "La4"]), total: 8 },
      { id: "u3l3", title: "Sol et Ré ensemble", exercise: "notes", pool: merge(stringNotes("sol"), stringNotes("re")), total: 12 },
      // l'autre sens du lien nom ↔ position : il ne se transfère qu'à moitié
      { id: "u3l4", title: "Écrire la note", exercise: "ecrire", pool: merge(stringNotes("sol"), stringNotes("re")), total: 8 },
      { id: "u3l5", title: "Point d'étape", exercise: "notes", pool: merge(stringNotes("sol"), stringNotes("re")), total: 14, timerMode: "adaptatif", checkpoint: true },
    ],
  },
  {
    id: "u4",
    title: "Compter les durées",
    hint: "La pointée et la croche",
    tone: "var(--moss)",
    lessons: [
      { id: "u4l1", title: "La noire pointée", exercise: "rythme", difficulty: "intermediaire", total: 8 },
      { id: "u4l2", title: "La croche", exercise: "rythme", difficulty: "intermediaire", total: 10 },
      { id: "u4l3", title: "Point d'étape", exercise: "rythme", difficulty: "intermediaire", total: 12, checkpoint: true },
    ],
  },
  {
    id: "u5",
    title: "La corde de La",
    hint: "Le registre central",
    tone: "var(--brick)",
    lessons: [
      { id: "u5l1", title: "La, Si, Do", exercise: "notes", pool: L(["La4", "Si4", "Do5"]), total: 8 },
      { id: "u5l2", title: "Ré et Mi", exercise: "notes", pool: L(["Do5", "Ré5", "Mi5"]), total: 8 },
      { id: "u5l3", title: "Trois cordes", exercise: "notes", pool: merge(stringNotes("sol"), stringNotes("re"), stringNotes("la")), total: 14 },
      { id: "u5l4", title: "Point d'étape", exercise: "notes", pool: merge(stringNotes("sol"), stringNotes("re"), stringNotes("la")), total: 14, timerMode: "adaptatif", checkpoint: true },
    ],
  },
  {
    id: "u6",
    title: "La corde de Mi",
    hint: "Les lignes supplémentaires du haut",
    tone: "var(--blue)",
    lessons: [
      { id: "u6l1", title: "Mi, Fa, Sol", exercise: "notes", pool: L(["Mi5", "Fa5", "Sol5"]), total: 8 },
      { id: "u6l2", title: "La et Si", exercise: "notes", pool: L(["Sol5", "La5", "Si5"]), total: 8 },
      {
        id: "u6l3", title: "Toute la première position", exercise: "notes",
        pool: merge(...byString.map((s) => s.notes)), total: 16,
      },
      {
        id: "u6l4", title: "Point d'étape", exercise: "notes",
        pool: merge(...byString.map((s) => s.notes)), total: 16,
        timerMode: "adaptatif", checkpoint: true,
      },
    ],
  },
  {
    id: "u65",
    title: "Le manche",
    hint: "Savoir où poser le doigt, pas seulement lire",
    tone: "var(--brick)",
    lessons: [
      { id: "u65l1", title: "Corde et doigt", exercise: "doigte", total: 10 },
      { id: "u65l2", title: "Sans hésiter", exercise: "doigte", total: 12 },
      { id: "u65l3", title: "Point d'étape", exercise: "doigte", total: 14, checkpoint: true },
    ],
  },
  {
    id: "u66",
    title: "La justesse",
    hint: "Jouer les notes, micro allumé",
    tone: "var(--mustard)",
    lessons: [
      // on commence par les cordes à vide : elles sont justes par
      // construction, ce qui laisse le temps d'apprivoiser l'aiguille
      { id: "u66l1", title: "Les cordes à vide", exercise: "justesse", pool: OPEN, total: 6 },
      { id: "u66l2", title: "Corde de Ré et de La", exercise: "justesse", pool: merge(stringNotes("re"), stringNotes("la")), total: 8 },
      {
        id: "u66l3", title: "Point d'étape", exercise: "justesse",
        pool: merge(...byString.map((s) => s.notes)), total: 10, checkpoint: true,
      },
    ],
  },
  {
    id: "u7",
    title: "L'oreille",
    hint: "Reconnaître un intervalle",
    tone: "var(--mustard)",
    lessons: [
      { id: "u7l1", title: "Quarte, quinte, octave", exercise: "intervalles", difficulty: "debutant", total: 8 },
      { id: "u7l2", title: "Tierces et sixtes", exercise: "intervalles", difficulty: "intermediaire", total: 10 },
      // ici la note est jouée sans être montrée : l'oreille travaille seule
      {
        id: "u7l3", title: "Écouter et placer", exercise: "ecouter",
        pool: merge(...byString.map((s) => s.notes)), total: 10,
      },
      { id: "u7l4", title: "Point d'étape", exercise: "intervalles", difficulty: "intermediaire", total: 12, checkpoint: true },
    ],
  },
  {
    id: "u75",
    title: "Lire en continu",
    hint: "Une mesure entière, et le rythme dans les doigts",
    tone: "var(--blue)",
    lessons: [
      {
        id: "u75l1", title: "Quatre notes à la suite", exercise: "mesure",
        pool: merge(stringNotes("re"), stringNotes("la")), total: 6,
      },
      {
        id: "u75l2", title: "Toute la première position", exercise: "mesure",
        pool: merge(...byString.map((s) => s.notes)), total: 8,
      },
      { id: "u75l3", title: "Taper le rythme", exercise: "dictee", difficulty: "debutant", total: 6 },
      { id: "u75l4", title: "Point d'étape", exercise: "dictee", difficulty: "intermediaire", total: 8, checkpoint: true },
    ],
  },
  {
    id: "u9",
    title: "Dièses et bémols",
    hint: "Les altérations, puis les armures",
    tone: "var(--brick)",
    lessons: [
      {
        id: "u9l1", title: "Les altérations", exercise: "notes",
        pool: merge(stringNotes("re"), stringNotes("la")), total: 10, alterations: true,
      },
      {
        id: "u9l2", title: "Sur toute la position", exercise: "notes",
        pool: merge(...byString.map((s) => s.notes)), total: 12, alterations: true,
      },
      { id: "u9l3", title: "Une, deux, trois altérations", exercise: "armures", difficulty: "debutant", total: 8 },
      { id: "u9l4", title: "Tout le cycle des quintes", exercise: "armures", difficulty: "intermediaire", total: 10 },
      { id: "u9l5", title: "Point d'étape", exercise: "armures", difficulty: "avance", total: 12, checkpoint: true },
    ],
  },
  {
    id: "u95",
    title: "Mesures et silences",
    hint: "La mesure entière, des silences, le 6/8",
    tone: "var(--blue)",
    lessons: [
      { id: "u95l1", title: "Reconnaître une mesure", exercise: "mesures", difficulty: "debutant", total: 8 },
      { id: "u95l2", title: "Avec des silences", exercise: "mesures", difficulty: "intermediaire", total: 10 },
      { id: "u95l3", title: "Mesures composées", exercise: "mesures", difficulty: "avance", total: 10 },
      { id: "u95l4", title: "Point d'étape", exercise: "mesures", difficulty: "avance", total: 12, checkpoint: true },
    ],
  },
  {
    id: "u10",
    title: "Produire l'intervalle",
    hint: "Le chanter ou le jouer, micro allumé",
    tone: "var(--mustard)",
    lessons: [
      { id: "u10l1", title: "Quarte, quinte, octave", exercise: "chanter", difficulty: "debutant", total: 6 },
      { id: "u10l2", title: "Tierces et sixtes", exercise: "chanter", difficulty: "intermediaire", total: 8 },
    ],
  },
  {
    id: "u8",
    title: "Au-delà de la première position",
    hint: "Toute la tessiture",
    tone: "var(--moss)",
    lessons: [
      { id: "u8l1", title: "Vers l'aigu", exercise: "notes", pool: upTo("La5", "Do6"), total: 10 },
      { id: "u8l2", title: "Les octaves hautes", exercise: "notes", pool: upTo("Do6", "Do7"), total: 10 },
      { id: "u8l3", title: "Toute la tessiture", exercise: "notes", pool: upTo("Sol3", "Do7"), total: 16, timerMode: "adaptatif" },
      { id: "u8l4", title: "Point d'étape", exercise: "notes", pool: upTo("Sol3", "Do7"), total: 18, timerMode: "adaptatif", checkpoint: true },
    ],
  },
  {
    id: "u11",
    title: "Changer de position",
    hint: "La main quitte la première position",
    tone: "var(--brick)",
    lessons: [
      { id: "u11l1", title: "2e position", exercise: "doigte", position: 2, total: 10 },
      { id: "u11l2", title: "3e position", exercise: "doigte", position: 3, total: 10 },
      { id: "u11l3", title: "Point d'étape", exercise: "doigte", position: 3, total: 12, checkpoint: true },
    ],
  },
  {
    id: "u12",
    title: "Doubles cordes",
    hint: "Deux notes ensemble, et la justesse qui compte double",
    tone: "var(--moss)",
    lessons: [
      { id: "u12l1", title: "Premières doubles cordes", exercise: "doubles", position: 1, total: 6 },
      { id: "u12l2", title: "Point d'étape", exercise: "doubles", position: 1, total: 8, checkpoint: true },
    ],
  },
];

/** Le programme à plat, dans l'ordre. */
export const ALL_LESSONS = UNITS.flatMap((u) =>
  u.lessons.map((l) => ({ ...l, unitId: u.id, unitTitle: u.title, tone: u.tone }))
);

/**
 * État d'une leçon : « or » (parfaite), « fait », « ouvert » ou
 * « verrouillé ». Une leçon s'ouvre dès que la précédente est faite —
 * on ne bloque jamais sur un point d'étape raté de peu.
 */
export function lessonStates(done) {
  let previousDone = true;
  return ALL_LESSONS.map((l) => {
    const d = done[l.id];
    const state = d === "or" ? "or" : d === "fait" ? "fait" : previousDone ? "ouvert" : "verrouille";
    previousDone = !!d;
    return { ...l, state };
  });
}

/** La prochaine leçon à faire. */
export function nextLesson(done) {
  const states = lessonStates(done);
  return states.find((l) => l.state === "ouvert") || states[states.length - 1];
}

/** Le sac réuni d'une unité, pour l'épreuve légendaire. */
export function unitLegendary(unitId) {
  const unit = UNITS.find((u) => u.id === unitId);
  if (!unit) return null;
  const lessons = unit.lessons;
  const withPool = lessons.filter((l) => l.pool);
  const pool = withPool.length ? merge(...withPool.map((l) => l.pool)) : null;
  // l'exercice le plus représenté dans l'unité donne le ton de l'épreuve
  const counts = {};
  for (const l of lessons) counts[l.exercise] = (counts[l.exercise] || 0) + 1;
  const exercise = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const difficulty = lessons.find((l) => l.difficulty)?.difficulty || "intermediaire";
  return {
    unitId, exercise, pool, difficulty,
    lessonIds: lessons.map((l) => l.id),
    total: Math.max(10, lessons.length * 3),
    title: unit.title,
  };
}

export function unitProgress(done, unitId) {
  const ls = ALL_LESSONS.filter((l) => l.unitId === unitId);
  const n = ls.filter((l) => done[l.id]).length;
  return { done: n, total: ls.length, complete: n === ls.length };
}
