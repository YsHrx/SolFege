/* ============================================================
   INTERVALLES
   ============================================================ */

export const INTERVALS = [
  { semitones: 0, name: "Unisson", short: "1" },
  { semitones: 1, name: "Seconde mineure", short: "2m" },
  { semitones: 2, name: "Seconde majeure", short: "2M" },
  { semitones: 3, name: "Tierce mineure", short: "3m" },
  { semitones: 4, name: "Tierce majeure", short: "3M" },
  { semitones: 5, name: "Quarte juste", short: "4" },
  { semitones: 6, name: "Quarte augmentée", short: "4+" },
  { semitones: 7, name: "Quinte juste", short: "5" },
  { semitones: 8, name: "Sixte mineure", short: "6m" },
  { semitones: 9, name: "Sixte majeure", short: "6M" },
  { semitones: 10, name: "Septième mineure", short: "7m" },
  { semitones: 11, name: "Septième majeure", short: "7M" },
  { semitones: 12, name: "Octave", short: "8" },
];

const bySemi = new Map(INTERVALS.map((i) => [i.semitones, i]));
export const intervalBySemitones = (s) => bySemi.get(s);

const pick = (...s) => INTERVALS.filter((i) => s.includes(i.semitones));

export const INTERVAL_POOL = {
  debutant: pick(0, 5, 7, 12),
  intermediaire: pick(0, 2, 3, 4, 5, 7, 9, 12),
  avance: INTERVALS,
};

/** Fondamentale tirée entre Ré4 et La4 : confortable et neutre. */
export const INTERVAL_BASE_MIN = 62;
export const INTERVAL_BASE_SPAN = 8;
