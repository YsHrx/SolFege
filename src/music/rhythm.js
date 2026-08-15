/* ============================================================
   VALEURS RYTHMIQUES
   ============================================================ */

export const RHYTHM_VALUES = [
  { id: "ronde", label: "Ronde", beats: 4 },
  { id: "blanche", label: "Blanche", beats: 2 },
  { id: "noire_pointee", label: "Noire pointée", beats: 1.5 },
  { id: "noire", label: "Noire", beats: 1 },
  { id: "croche", label: "Croche", beats: 0.5 },
  { id: "double", label: "Double-croche", beats: 0.25 },
];

const byId = new Map(RHYTHM_VALUES.map((r) => [r.id, r]));
export const rhythmById = (id) => byId.get(id);

const pick = (...ids) => RHYTHM_VALUES.filter((r) => ids.includes(r.id));

export const RHYTHM_POOL = {
  debutant: pick("ronde", "blanche", "noire"),
  intermediaire: pick("ronde", "blanche", "noire_pointee", "noire", "croche"),
  avance: RHYTHM_VALUES,
};

/** Tempo de référence du module, en millisecondes par pulsation. */
export const BEAT_MS = 620; // environ 97 à la noire
