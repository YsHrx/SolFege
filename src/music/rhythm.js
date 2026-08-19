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

/** Tempo de référence par défaut, en millisecondes par pulsation. */
export const BEAT_MS = 620; // environ 97 à la noire

/** Bornes du réglage de tempo, en battements par minute. */
export const TEMPO = { min: 50, max: 140, default: 97 };
export const beatMsFor = (bpm) => 60000 / (bpm || TEMPO.default);

/* ============================================================
   SILENCES

   Chaque valeur a son silence. Ils comptent dans la mesure comme les
   notes, et une lecture rythmique qui n'en contient jamais laisse
   croire qu'un rythme est une suite ininterrompue de sons.
   ============================================================ */
export const RESTS = {
  ronde: "pause",
  blanche: "demi_pause",
  noire_pointee: "soupir_pointe",
  noire: "soupir",
  croche: "demi_soupir",
  double: "quart_soupir",
};

/* ============================================================
   MESURES

   `pulse` est la valeur qui bat : la noire dans une mesure simple, la
   noire pointée dans une mesure composée. `beats` compte ces pulsations,
   et `unit` la durée qui vaut un temps écrit — c'est ce qui distingue
   un 6/8 (deux pulsations pointées) d'un 3/4 (trois noires), alors que
   les deux durent six croches.
   ============================================================ */
export const METERS = [
  { id: "4/4", top: 4, bottom: 4, pulses: 4, pulseBeats: 1, compound: false, label: "4/4" },
  { id: "3/4", top: 3, bottom: 4, pulses: 3, pulseBeats: 1, compound: false, label: "3/4" },
  { id: "2/4", top: 2, bottom: 4, pulses: 2, pulseBeats: 1, compound: false, label: "2/4" },
  { id: "6/8", top: 6, bottom: 8, pulses: 2, pulseBeats: 1.5, compound: true, label: "6/8" },
  { id: "9/8", top: 9, bottom: 8, pulses: 3, pulseBeats: 1.5, compound: true, label: "9/8" },
];

const meterById = new Map(METERS.map((m) => [m.id, m]));
export const meterFor = (id) => meterById.get(id) || METERS[0];

/** Durée totale d'une mesure, en temps (noires). */
export const meterBeats = (m) => m.pulses * m.pulseBeats;

export const METER_POOL = {
  debutant: ["4/4"],
  intermediaire: ["4/4", "3/4", "2/4"],
  avance: ["4/4", "3/4", "2/4", "6/8", "9/8"],
};

/* ============================================================
   MOTIFS

   Un motif est une suite de { value, rest } dont les durées remplissent
   exactement la mesure. En mesure composée, on privilégie les groupes
   de trois croches : un 6/8 rempli de noires ne sonnerait pas comme un
   6/8.
   ============================================================ */
export function buildPattern(meter, pool, { rests = true } = {}) {
  const total = meterBeats(meter);
  const usable = pool.filter((v) => v.beats <= total);
  if (!usable.length) return [{ value: RHYTHM_VALUES[0], rest: false }];

  for (let attempt = 0; attempt < 120; attempt++) {
    const seq = [];
    let left = total;
    while (left > 0.001) {
      let fits = usable.filter((v) => v.beats <= left + 0.001);
      /* En mesure composée, une figure ne franchit pas la pulsation : une
         blanche à cheval sur deux noires pointées ne s'écrit pas comme ça
         et ne s'entend pas comme un 6/8. On regarde donc ce qu'il reste
         jusqu'à la PROCHAINE pulsation, pas jusqu'au bout de la mesure.
         Seule exception, depuis une pulsation : une valeur qui couvre un
         nombre entier de pulsations reste licite. */
      if (meter.compound) {
        const rem = (total - left) % meter.pulseBeats;
        const onPulse = rem < 0.001 || meter.pulseBeats - rem < 0.001;
        const toPulse = onPulse ? meter.pulseBeats : meter.pulseBeats - rem;
        const inPulse = fits.filter((v) => {
          if (v.beats <= toPulse + 0.001) return true;
          if (!onPulse) return false;
          const pulses = v.beats / meter.pulseBeats;
          return Math.abs(pulses - Math.round(pulses)) < 0.001;
        });
        if (inPulse.length) fits = inPulse;
      }
      if (!fits.length) break;
      const value = fits[Math.floor(Math.random() * fits.length)];
      // un silence de temps en temps, jamais en tête de mesure — une
      // mesure qui commence par un blanc est indevinable à l'oreille
      const isRest = rests && seq.length > 0 && Math.random() < 0.18;
      seq.push({ value, rest: isRest });
      left -= value.beats;
    }
    if (Math.abs(left) < 0.001 && seq.length >= 2 && seq.length <= 8) {
      // au moins deux sons : un motif presque entièrement silencieux
      // ne s'entend pas
      if (seq.filter((s) => !s.rest).length >= 2) return seq;
    }
  }
  /* Ultime recours : on remplit la mesure de pulsations. La noire pointée
     pour une mesure composée — une mesure à 9/8 dure 4,5 temps, que des
     noires ne rempliraient jamais exactement. */
  const fill = RHYTHM_VALUES.find(
    (v) => v.id === (meter.compound ? "noire_pointee" : "noire")
  );
  return Array.from({ length: meter.pulses }, () => ({ value: fill, rest: false }));
}

export const patternKey = (seq) =>
  seq.map((s) => (s.rest ? "r" : "n") + s.value.id).join(".");

/** Deux motifs sonnent-ils pareil ? Sert à écarter les leurres inutiles. */
export const sameSound = (a, b) => patternKey(a) === patternKey(b);
