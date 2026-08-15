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
      { id: "u3l4", title: "Point d'étape", exercise: "notes", pool: merge(stringNotes("sol"), stringNotes("re")), total: 14, timerMode: "adaptatif", checkpoint: true },
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
    id: "u7",
    title: "L'oreille",
    hint: "Reconnaître un intervalle",
    tone: "var(--mustard)",
    lessons: [
      { id: "u7l1", title: "Quarte, quinte, octave", exercise: "intervalles", difficulty: "debutant", total: 8 },
      { id: "u7l2", title: "Tierces et sixtes", exercise: "intervalles", difficulty: "intermediaire", total: 10 },
      { id: "u7l3", title: "Point d'étape", exercise: "intervalles", difficulty: "intermediaire", total: 12, checkpoint: true },
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

export function unitProgress(done, unitId) {
  const ls = ALL_LESSONS.filter((l) => l.unitId === unitId);
  const n = ls.filter((l) => done[l.id]).length;
  return { done: n, total: ls.length, complete: n === ls.length };
}
