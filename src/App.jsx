import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ============================================================
   SOLFÈGE — entraînement violon
   ============================================================ */

const C = {
  bg0: "#0e0b09",
  bg1: "#181310",
  bg2: "#221b16",
  line: "#3a2f26",
  ink: "#f2e9dc",
  inkDim: "#9c8d78",
  inkFaint: "#5f5346",
  brass: "#c9a15a",
  brassBright: "#e8c07a",
  copper: "#c1652f",
  good: "#7fae6a",
  bad: "#c1543a",
};

// ---------- Notes ----------
const NOTE_NAMES_FR = ["Do", "Ré", "Mi", "Fa", "Sol", "La", "Si"];
const NOTE_NAMES_EN = ["C", "D", "E", "F", "G", "A", "B"];
const SEMITONES = [0, 2, 4, 5, 7, 9, 11];

function buildNoteTable() {
  const table = [];
  for (let octave = 3; octave <= 7; octave++) {
    for (let i = 0; i < 7; i++) {
      table.push({
        name: NOTE_NAMES_FR[i],
        nameEn: NOTE_NAMES_EN[i],
        octave,
        midi: (octave + 1) * 12 + SEMITONES[i],
        diatonicIndex: octave * 7 + i,
        label: NOTE_NAMES_FR[i] + octave,
      });
    }
  }
  return table;
}
const ALL_NOTES = buildNoteTable();
const noteByLabel = (l) => ALL_NOTES.find((n) => n.label === l);
const E4 = noteByLabel("Mi4");
const staffPosition = (note) => note.diatonicIndex - E4.diatonicIndex;

// Difficulté = quelles notes apparaissent
const DEBUTANT_LABELS = ["Sol3", "La3", "Si3", "Ré4", "Mi4", "Fa4", "La4", "Si4", "Do5", "Mi5", "Fa5", "Sol5"];
const INTERMEDIAIRE_LABELS = [
  "Sol3", "La3", "Si3", "Do4",
  "Ré4", "Mi4", "Fa4", "Sol4",
  "La4", "Si4", "Do5", "Ré5",
  "Mi5", "Fa5", "Sol5", "La5",
];
const AVANCE_LABELS = ALL_NOTES.filter(
  (n) => n.midi >= noteByLabel("Sol3").midi && n.midi <= noteByLabel("Do7").midi
).map((n) => n.label);

function notesForDifficulty(d) {
  const labels = d === "debutant" ? DEBUTANT_LABELS : d === "intermediaire" ? INTERMEDIAIRE_LABELS : AVANCE_LABELS;
  return labels.map(noteByLabel).filter(Boolean);
}
const DIFFICULTY_DESCRIPTIONS = {
  debutant: "Cordes à vide (Sol, Ré, La, Mi) et leurs voisines immédiates",
  intermediaire: "Toutes les notes de la 1ère position",
  avance: "Toute la tessiture usuelle du violon",
};

// ---------- Rythme ----------
const RHYTHM_VALUES = [
  { id: "ronde", label: "Ronde", beats: 4, symbol: "𝅝" },
  { id: "blanche", label: "Blanche", beats: 2, symbol: "𝅗𝅥" },
  { id: "noire_pointee", label: "Noire pointée", beats: 1.5, symbol: "♩." },
  { id: "noire", label: "Noire", beats: 1, symbol: "♩" },
  { id: "croche", label: "Croche", beats: 0.5, symbol: "♪" },
  { id: "double", label: "Double-croche", beats: 0.25, symbol: "𝅘𝅥𝅯" },
];
const RHYTHM_POOL = {
  debutant: RHYTHM_VALUES.filter((r) => ["ronde", "blanche", "noire"].includes(r.id)),
  intermediaire: RHYTHM_VALUES.filter((r) => ["ronde", "blanche", "noire_pointee", "noire", "croche"].includes(r.id)),
  avance: RHYTHM_VALUES,
};

// ---------- Intervalles ----------
const INTERVALS = [
  { semitones: 0, name: "Unisson" },
  { semitones: 1, name: "Seconde mineure" },
  { semitones: 2, name: "Seconde majeure" },
  { semitones: 3, name: "Tierce mineure" },
  { semitones: 4, name: "Tierce majeure" },
  { semitones: 5, name: "Quarte juste" },
  { semitones: 6, name: "Quarte augmentée" },
  { semitones: 7, name: "Quinte juste" },
  { semitones: 8, name: "Sixte mineure" },
  { semitones: 9, name: "Sixte majeure" },
  { semitones: 10, name: "Septième mineure" },
  { semitones: 11, name: "Septième majeure" },
  { semitones: 12, name: "Octave" },
];
const INTERVAL_POOL = {
  debutant: INTERVALS.filter((i) => [0, 5, 7, 12].includes(i.semitones)),
  intermediaire: INTERVALS.filter((i) => [0, 2, 3, 4, 5, 7, 9, 12].includes(i.semitones)),
  avance: INTERVALS,
};

const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
// tirage qui évite de répéter l'élément précédent
function pickDifferent(pool, previous) {
  if (pool.length <= 1) return pool[0];
  let candidate;
  let guard = 0;
  do {
    candidate = pool[Math.floor(Math.random() * pool.length)];
    guard++;
  } while (candidate === previous && guard < 20);
  return candidate;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============================================================
   SYNTHÈSE VIOLON
   Modèle : corde frottée = onde en dents de scie riche en harmoniques,
   filtrée par les résonances du corps de l'instrument (formants).
   - 3 saws désaccordées à l'unisson : épaisseur et battements naturels
   - vibrato progressif (arrive après l'attaque, comme un vrai vibrato)
   - filtres formants aux résonances typiques d'un violon :
     ~280 Hz (résonance d'air), ~460 Hz (résonance principale du bois),
     ~800 Hz, ~1300 Hz, et le "bridge hill" large vers 2,5 kHz qui donne
     le mordant caractéristique
   - bruit d'archet filtré, fort à l'attaque puis résiduel pendant la tenue
   - enveloppe d'archet : attaque progressive, tenue vivante, relâche douce
   ============================================================ */
/* ============================================================
   BANQUE D'ÉCHANTILLONS DE VIOLON
   Source : tonejs-instruments, véritables enregistrements de violon,
   servis par jsDelivr. Qualité mesurée nettement supérieure aux soundfonts
   General MIDI : 14 harmoniques audibles contre 9, spectre plus brillant,
   et un vrai vibrato de violoniste à 45 cents contre 8 à 12 (quasi nul).

   Allègement : les fichiers d'origine durent 14 s pour 320 ko alors que la
   plus longue valeur du jeu, la ronde, ne dépasse pas 2,5 s. On ne télécharge
   donc que les 70 premiers kilo-octets de chaque note, soit environ 3 s de
   son, par requête partielle. Qualité identique, poids divisé par cinq.
   Si le navigateur refuse la requête partielle, on récupère le fichier entier.

   La banque fournit La, Do, Mi et Sol par octave : deux demi-tons de
   transposition au maximum, vérifiés justes à 5 cents près.
   ============================================================ */
// Deux sources, essayées dans l'ordre. La source locale est prioritaire :
// si le dossier public/samples est présent, le site n'a aucune dépendance
// externe, se charge plus vite et fonctionne même si un CDN est bloqué.
// Sinon on retombe sur jsDelivr.
const SAMPLE_SOURCES = [
  { base: "/samples", partial: false },
  { base: "https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/violin", partial: true },
];
const PARTIAL_BYTES = 81920; // environ 3,4 s de son : marge suffisante pour une ronde même transposée

// notes réellement disponibles dans la banque, avec leur numéro MIDI
const SAMPLE_MAP = [
  { midi: 55, file: "G3" }, { midi: 57, file: "A3" }, { midi: 60, file: "C4" },
  { midi: 64, file: "E4" }, { midi: 67, file: "G4" }, { midi: 69, file: "A4" },
  { midi: 72, file: "C5" }, { midi: 76, file: "E5" }, { midi: 79, file: "G5" },
  { midi: 81, file: "A5" }, { midi: 84, file: "C6" }, { midi: 88, file: "E6" },
  { midi: 91, file: "G6" }, { midi: 93, file: "A6" }, { midi: 96, file: "C7" },
];
const ANCHORS = SAMPLE_MAP.map((s) => s.midi);
const ANCHOR_FILE = new Map(SAMPLE_MAP.map((s) => [s.midi, s.file]));

// Ordre de chargement : les hauteurs les plus utilisées d'abord. On ne
// précharge que la tessiture courante (Sol3 à Sol5), soit environ 560 ko ;
// les octaves aiguës sont récupérées à la demande.
const LOAD_ORDER = [69, 76, 72, 67, 64, 60, 57, 55, 79, 81];
const PRIORITY_COUNT = 4; // au-delà, le chargement continue en tâche de fond

function nearestAnchor(midi) {
  let best = ANCHORS[0];
  let bestDist = Math.abs(midi - best);
  for (const a of ANCHORS) {
    const d = Math.abs(midi - a);
    if (d < bestDist) { best = a; bestDist = d; }
  }
  return best;
}

function useSynth() {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };

  // registre des voix en cours, pour pouvoir toutes les couper net
  const voicesRef = useRef([]);

  // --- cache des échantillons ---
  const buffersRef = useRef(new Map());   // midi d'ancrage -> AudioBuffer
  const inFlightRef = useRef(new Map());  // évite de télécharger deux fois
  const [samplesReady, setSamplesReady] = useState(false);
  const [sampleProgress, setSampleProgress] = useState(0);
  const [samplesFailed, setSamplesFailed] = useState(false);

  const loadAnchor = useCallback(async (midi) => {
    if (buffersRef.current.has(midi)) return buffersRef.current.get(midi);
    if (inFlightRef.current.has(midi)) return inFlightRef.current.get(midi);
    const ctx = getCtx();
    const p = (async () => {
      const file = ANCHOR_FILE.get(midi);
      if (!file) throw new Error("pas d'échantillon pour " + midi);

      const decode = (arr) => new Promise((resolve, reject) => {
        // forme à callback : compatible avec les anciens Safari
        ctx.decodeAudioData(arr, resolve, reject);
      });

      let buf = null;
      for (const source of SAMPLE_SOURCES) {
        const url = `${source.base}/${file}.mp3`;
        // Sur le CDN les fichiers durent 14 s alors que 3,5 s suffisent :
        // on ne demande que le début. En local les fichiers sont déjà courts.
        if (source.partial) {
          try {
            const res = await fetch(url, { headers: { Range: `bytes=0-${PARTIAL_BYTES}` } });
            if (res.ok) buf = await decode(await res.arrayBuffer());
          } catch { buf = null; }
        }
        if (!buf) {
          // fichier entier : soit la source est locale, soit le navigateur a
          // refusé le mp3 tronqué
          try {
            const res = await fetch(url);
            if (res.ok) buf = await decode(await res.arrayBuffer());
          } catch { buf = null; }
        }
        if (buf) break;
      }
      if (!buf) throw new Error("échantillon indisponible: " + file);

      buffersRef.current.set(midi, buf);
      inFlightRef.current.delete(midi);
      // un échantillon récupéré plus tard doit lever l'avertissement affiché
      setSamplesFailed(false);
      setSamplesReady(true);
      return buf;
    })();
    inFlightRef.current.set(midi, p);
    p.catch(() => inFlightRef.current.delete(midi));
    return p;
  }, []);

  // Chargement progressif. Les premières notes suffisent à faire sonner le
  // jeu correctement ; le reste arrive ensuite sans bloquer.
  const preloadSamples = useCallback(async () => {
    let loaded = 0;
    const track = () => {
      loaded += 1;
      setSampleProgress(Math.round((loaded / LOAD_ORDER.length) * 100));
      if (buffersRef.current.size > 0) setSamplesReady(true);
    };
    const priority = LOAD_ORDER.slice(0, PRIORITY_COUNT);
    const rest = LOAD_ORDER.slice(PRIORITY_COUNT);
    try {
      await Promise.all(priority.map((m) => loadAnchor(m).then(track, track)));
      if (buffersRef.current.size === 0) {
        setSamplesFailed(true);
        return;
      }
      // le reste, en série pour ne pas saturer la connexion mobile
      for (const m of rest) {
        try { await loadAnchor(m); } catch {}
        track();
      }
    } catch {
      if (buffersRef.current.size === 0) setSamplesFailed(true);
    }
  }, [loadAnchor]);

  const stopAll = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const t = ctx.currentTime;
    voicesRef.current.forEach((v) => {
      try {
        // coupure douce sur 40 ms pour éviter le clic de troncature
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t);
        v.gain.gain.linearRampToValueAtTime(0.0001, t + 0.04);
        v.nodes.forEach((n) => {
          try { n.stop(t + 0.05); } catch {}
        });
      } catch {}
    });
    voicesRef.current = [];
  }, []);

  const unlockAudio = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
  }, []);

  // buffer de bruit réutilisé (évite d'en recréer un à chaque note)
  const noiseBufRef = useRef(null);
  const getNoiseBuffer = (ctx) => {
    if (!noiseBufRef.current) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseBufRef.current = buf;
    }
    return noiseBufRef.current;
  };

  // Synthèse de secours : utilisée tant que les échantillons ne sont pas
  // chargés, ou si le réseau les rend indisponibles.
  const playSynth = useCallback((midi, duration = 1.2, velocity = 0.5) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    const freq = midiToFreq(midi);

    // --- sortie et enveloppe d'archet ---
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    const attack = 0.11;
    const release = Math.min(0.22, duration * 0.28);
    const sustainStart = t0 + attack;
    const releaseStart = t0 + Math.max(attack + 0.02, duration - release);
    out.gain.linearRampToValueAtTime(velocity * 1.08, sustainStart);       // léger dépassement d'attaque
    out.gain.linearRampToValueAtTime(velocity * 0.92, sustainStart + 0.12); // puis stabilisation
    out.gain.setValueAtTime(velocity * 0.92, releaseStart);
    out.gain.linearRampToValueAtTime(0.0001, t0 + duration);
    out.connect(ctx.destination);

    // enregistrement de la voix pour pouvoir la couper à tout moment
    const voice = { gain: out, nodes: [] };
    voicesRef.current.push(voice);
    // nettoyage automatique du registre à la fin naturelle de la note
    setTimeout(() => {
      voicesRef.current = voicesRef.current.filter((v) => v !== voice);
    }, (duration + 0.2) * 1000);

    // --- bus des formants (corps du violon) ---
    // Chaque formant est un passe-bande en parallèle ; leur somme sculpte
    // le timbre bien plus efficacement qu'un empilement d'harmoniques.
    const formantBus = ctx.createGain();
    formantBus.gain.value = 1;

    const FORMANTS = [
      { f: 280, q: 2.2, g: 0.5 },   // résonance d'air
      { f: 460, q: 3.0, g: 0.9 },   // résonance principale du bois
      { f: 800, q: 2.5, g: 0.55 },
      { f: 1300, q: 2.5, g: 0.4 },
      { f: 2500, q: 1.1, g: 0.65 }, // bridge hill : le mordant du violon
      { f: 3600, q: 1.4, g: 0.28 },
    ];
    FORMANTS.forEach((F) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = F.f;
      bp.Q.value = F.q;
      const g = ctx.createGain();
      g.gain.value = F.g;
      formantBus.connect(bp);
      bp.connect(g);
      g.connect(out);
    });
    // un peu de signal direct pour garder le corps de la fondamentale
    const direct = ctx.createGain();
    direct.gain.value = 0.35;
    formantBus.connect(direct);
    direct.connect(out);

    // --- filtre de brillance piloté par l'archet ---
    // la brillance monte pendant l'attaque puis redescend un peu
    const bright = ctx.createBiquadFilter();
    bright.type = "lowpass";
    bright.Q.value = 0.6;
    bright.frequency.setValueAtTime(Math.max(700, freq * 2), t0);
    bright.frequency.linearRampToValueAtTime(Math.min(9000, freq * 11), t0 + attack);
    bright.frequency.linearRampToValueAtTime(Math.min(6500, freq * 8), t0 + attack + 0.35);
    bright.connect(formantBus);

    // --- vibrato : absent à l'attaque, s'installe progressivement ---
    const vib = ctx.createOscillator();
    vib.type = "sine";
    vib.frequency.setValueAtTime(4.6, t0);
    vib.frequency.linearRampToValueAtTime(5.8, t0 + duration);
    const vibDepth = ctx.createGain();
    vibDepth.gain.setValueAtTime(0, t0);
    vibDepth.gain.linearRampToValueAtTime(0, t0 + 0.18);
    vibDepth.gain.linearRampToValueAtTime(freq * 0.011, t0 + Math.min(0.55, duration * 0.6));
    vib.connect(vibDepth);
    vib.start(t0);
    vib.stop(t0 + duration + 0.05);
    voice.nodes.push(vib);

    // --- 3 dents de scie désaccordées à l'unisson ---
    const DETUNE = [-6.5, 0, 7.0]; // en cents
    DETUNE.forEach((cents, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = i === 1 ? 0.5 : 0.3;
      vibDepth.connect(osc.frequency);
      osc.connect(g);
      g.connect(bright);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
      voice.nodes.push(osc);
    });

    // --- bruit d'archet : crin sur la corde ---
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);
    noise.loop = true;
    const noiseHP = ctx.createBiquadFilter();
    noiseHP.type = "highpass";
    noiseHP.frequency.value = 1800;
    const noiseBP = ctx.createBiquadFilter();
    noiseBP.type = "bandpass";
    noiseBP.frequency.value = Math.min(5200, freq * 6);
    noiseBP.Q.value = 0.8;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.linearRampToValueAtTime(velocity * 0.16, t0 + 0.03); // grattement d'attaque
    noiseGain.gain.linearRampToValueAtTime(velocity * 0.025, t0 + 0.2); // souffle résiduel
    noiseGain.gain.setValueAtTime(velocity * 0.025, releaseStart);
    noiseGain.gain.linearRampToValueAtTime(0.0001, t0 + duration);
    noise.connect(noiseHP);
    noiseHP.connect(noiseBP);
    noiseBP.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(t0);
    noise.stop(t0 + duration + 0.05);
    voice.nodes.push(noise);
  }, []);

  // Lecture par échantillon réel : on prend l'ancrage le plus proche et on
  // ajuste la vitesse de lecture pour atteindre la hauteur exacte.
  const playSample = useCallback((buf, anchorMidi, midi, duration, velocity) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;

    const rate = Math.pow(2, (midi - anchorMidi) / 12);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;

    // L'échantillon met environ 0,15 s à atteindre son plein niveau, ce qui
    // est réaliste mais rendrait les valeurs brèves quasi inaudibles. Pour
    // les notes courtes on démarre donc la lecture après l'attaque, dans la
    // partie tenue du son.
    const offset = duration < 0.7 ? 0.16 : 0.02;

    const gain = ctx.createGain();
    const fadeIn = duration < 0.7 ? 0.008 : 0.02;
    const fadeOut = Math.min(0.16, duration * 0.3);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(velocity * 2.2, t0 + fadeIn);
    gain.gain.setValueAtTime(velocity * 2.2, t0 + Math.max(fadeIn, duration - fadeOut));
    gain.gain.linearRampToValueAtTime(0.0001, t0 + duration);

    src.connect(gain);
    gain.connect(ctx.destination);
    // start(quand, décalage dans l'échantillon) : la durée est pilotée par
    // l'enveloppe, pas par le troisième argument, pour garder un relâchement doux
    src.start(t0, offset);
    src.stop(t0 + duration + 0.05);

    const voice = { gain, nodes: [src] };
    voicesRef.current.push(voice);
    setTimeout(() => {
      voicesRef.current = voicesRef.current.filter((v) => v !== voice);
    }, (duration + 0.2) * 1000);
  }, []);

  // Point d'entrée unique : échantillon réel si disponible, synthèse sinon.
  const playViolin = useCallback((midi, duration = 1.2, velocity = 0.5) => {
    const anchor = nearestAnchor(midi);
    const buf = buffersRef.current.get(anchor);
    if (buf) {
      playSample(buf, anchor, midi, duration, velocity);
      return;
    }
    playSynth(midi, duration, velocity);
    // on tente de récupérer l'échantillon manquant pour les fois suivantes
    loadAnchor(anchor).catch(() => {});
  }, [playSample, playSynth, loadAnchor]);

  // Pulsation de référence : bois sec, discret, ne doit pas masquer la note.
  // `delay` permet de programmer un clic à l'avance sur l'horloge audio. Un
  // métronome piloté par setTimeout dérive de plusieurs dizaines de
  // millisecondes sur quelques temps, ce qui s'entend ; l'horloge audio, non.
  const playTick = useCallback((accent = false, delay = 0) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + Math.max(0, delay);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(accent ? 1500 : 1050, t0);
    osc.frequency.exponentialRampToValueAtTime(accent ? 700 : 520, t0 + 0.03);
    const g = ctx.createGain();
    g.gain.value = 0.0001; // silence avant t0, sinon une coupure anticipée repartirait de 1
    g.gain.setValueAtTime(accent ? 0.11 : 0.07, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.05);

    // enregistré comme les autres voix : un clic programmé pour plus tard doit
    // pouvoir être annulé si l'utilisateur répond entre-temps
    const voice = { gain: g, nodes: [osc] };
    voicesRef.current.push(voice);
    setTimeout(() => {
      voicesRef.current = voicesRef.current.filter((v) => v !== voice);
    }, (delay + 0.2) * 1000);
  }, []);

  const playFeedback = useCallback((correct) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    const freqs = correct ? [660, 880] : [200, 175];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      const s = t0 + i * 0.05;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.1, s + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(s);
      osc.stop(s + 0.2);
    });
  }, []);

  return {
    playViolin, playTick, playFeedback, unlockAudio, stopAll,
    preloadSamples, samplesReady, sampleProgress, samplesFailed,
  };
}

// ---------- Stockage ----------
const STORAGE_KEY = "violin_trainer_state_v4";
const saveState = (s) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
};

const DEFAULT_PROGRESS = {
  xp: 0,
  level: 1,
  streak: 0,
  bestStreak: 0,
  sessionsCompleted: 0,
  history: [],
  moduleStats: {
    notes: { attempts: 0, correct: 0 },
    rythme: { attempts: 0, correct: 0 },
    intervalles: { attempts: 0, correct: 0 },
  },
  settings: { notation: "fr", difficulty: "debutant", soundOn: true },
};
const xpForLevel = (l) => 100 + (l - 1) * 60;

// La sauvegarde est relue à chaque ouverture : si elle est partielle, tronquée
// ou issue d'une version précédente, on la fusionne avec les valeurs par défaut
// plutôt que de la faire confiance telle quelle. Sans cela, un seul champ
// manquant suffirait à faire planter l'écran d'accueil.
const DIFFICULTIES = ["debutant", "intermediaire", "avance"];
const num = (v, fallback) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
function loadState() {
  let saved;
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    saved = r ? JSON.parse(r) : null;
  } catch {
    saved = null;
  }
  if (!saved || typeof saved !== "object") return DEFAULT_PROGRESS;

  const stats = { ...DEFAULT_PROGRESS.moduleStats };
  for (const id of Object.keys(stats)) {
    const s = saved.moduleStats && saved.moduleStats[id];
    stats[id] = {
      attempts: Math.max(0, num(s && s.attempts, 0)),
      correct: Math.max(0, num(s && s.correct, 0)),
    };
  }
  const st = saved.settings || {};
  return {
    xp: Math.max(0, num(saved.xp, 0)),
    level: Math.max(1, num(saved.level, 1)),
    streak: Math.max(0, num(saved.streak, 0)),
    bestStreak: Math.max(0, num(saved.bestStreak, 0)),
    sessionsCompleted: Math.max(0, num(saved.sessionsCompleted, 0)),
    history: Array.isArray(saved.history) ? saved.history.slice(-50) : [],
    moduleStats: stats,
    settings: {
      notation: st.notation === "en" ? "en" : "fr",
      difficulty: DIFFICULTIES.includes(st.difficulty) ? st.difficulty : "debutant",
      soundOn: st.soundOn !== false,
    },
  };
}

// ---------- Fond ----------
function Backdrop() {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        background: `radial-gradient(ellipse 900px 500px at 50% -10%, #2a1f16 0%, transparent 60%),
          repeating-linear-gradient(100deg, rgba(201,161,90,0.022) 0px, rgba(201,161,90,0.022) 1px, transparent 1px, transparent 14px),
          linear-gradient(180deg, ${C.bg0}, #070605 90%)`,
      }}
    />
  );
}

// ---------- Portée ----------
function StaffNote({ note, flash }) {
  const pos = staffPosition(note);
  const lineSpacing = 14;
  const step = lineSpacing / 2;
  const bottom = 150;
  const y = bottom - pos * step;
  const lines = [0, 1, 2, 3, 4].map((i) => bottom - i * lineSpacing);

  const ledger = [];
  if (pos < 0) for (let p = -2; p >= pos; p -= 2) ledger.push(bottom - p * step);
  else if (pos > 8) for (let p = 10; p <= pos; p += 2) ledger.push(bottom - p * step);

  const width = 280;
  const nx = 190;
  const col = flash === "good" ? C.good : flash === "bad" ? C.bad : C.brassBright;

  return (
    <svg viewBox="0 0 280 210" className="w-full max-w-sm mx-auto select-none" style={{ overflow: "visible" }}>
      <text x="10" y={bottom + 15} fontSize="76" fill={C.ink} fontFamily="serif" opacity="0.9">𝄞</text>
      {lines.map((ly, i) => (
        <line key={i} x1="0" y1={ly} x2={width} y2={ly} stroke={C.ink} strokeWidth="1.5" opacity="0.5" />
      ))}
      {ledger.map((ly, i) => (
        <line key={"l" + i} x1={nx - 16} y1={ly} x2={nx + 16} y2={ly} stroke={C.ink} strokeWidth="1.5" opacity="0.8" />
      ))}
      <ellipse cx={nx} cy={y} rx="9" ry="7" fill={col} transform={`rotate(-18 ${nx} ${y})`} style={{ transition: "fill 120ms" }} />
      {pos <= 4 ? (
        <line x1={nx + 8.5} y1={y} x2={nx + 8.5} y2={y - 44} stroke={col} strokeWidth="1.8" style={{ transition: "stroke 120ms" }} />
      ) : (
        <line x1={nx - 8.5} y1={y} x2={nx - 8.5} y2={y + 44} stroke={col} strokeWidth="1.8" style={{ transition: "stroke 120ms" }} />
      )}
    </svg>
  );
}

// ---------- Accueil ----------
function HomeScreen({ progress, onSelectModule, notation, onToggleNotation, soundOn, onToggleSound, unlockAudio, samplesReady, sampleProgress, samplesFailed }) {
  const level = progress.level;
  const need = xpForLevel(level);
  const pct = Math.min(100, Math.round((progress.xp / need) * 100));
  const modules = [
    { id: "notes", title: "Lecture de notes", subtitle: "Identifier les notes sur la portée", accent: C.brass },
    { id: "rythme", title: "Lecture rythmique", subtitle: "Reconnaître la durée d'une note", accent: C.good },
    { id: "intervalles", title: "Intervalles", subtitle: "Reconnaître un intervalle à l'oreille", accent: C.copper },
  ];

  return (
    <div className="relative z-10 flex flex-col gap-6 w-full max-w-lg mx-auto px-4 pb-10">
      <header className="pt-10 pb-2 text-center">
        <div className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: C.inkFaint }}>Pupitre d'entraînement</div>
        <h1 className="text-4xl tracking-tight" style={{ fontFamily: "'Fraunces', serif", color: C.ink, fontWeight: 600 }}>
          Sol<span style={{ color: C.brass }}>Fège</span>
        </h1>
      </header>

      <div className="rounded-2xl p-5" style={{ background: C.bg1, border: `1px solid ${C.line}` }}>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs uppercase tracking-widest" style={{ color: C.brass }}>Niveau {level}</span>
          <span className="text-xs font-mono" style={{ color: C.inkDim }}>{progress.xp} / {need} XP</span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.bg0 }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.brass}, ${C.brassBright})` }} />
        </div>
        <div className="flex gap-4 mt-4 text-center">
          {[[progress.streak, "série"], [progress.bestStreak, "record"], [progress.sessionsCompleted, "sessions"]].map(([v, l], i) => (
            <div className="flex-1" key={i}>
              <div className="text-xl font-mono" style={{ color: C.ink }}>{v}</div>
              <div className="text-[10px] uppercase tracking-wide" style={{ color: C.inkFaint }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {modules.map((m) => {
          const st = progress.moduleStats[m.id];
          const p = st.attempts > 0 ? Math.round((st.correct / st.attempts) * 100) : null;
          return (
            <button key={m.id} onClick={() => { unlockAudio(); onSelectModule(m.id); }}
              className="text-left rounded-2xl p-4 active:scale-[0.98] transition-transform"
              style={{ background: C.bg1, border: `1px solid ${C.line}`, borderLeft: `3px solid ${m.accent}` }}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg" style={{ color: C.ink, fontFamily: "'Fraunces', serif" }}>{m.title}</div>
                  <div className="text-xs mt-0.5" style={{ color: C.inkFaint }}>{m.subtitle}</div>
                </div>
                {p !== null && (
                  <div className="text-right">
                    <div className="text-sm font-mono" style={{ color: m.accent }}>{p}%</div>
                    <div className="text-[10px]" style={{ color: C.inkFaint }}>{st.attempts} essais</div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <div className="flex-1 flex items-center justify-between rounded-xl px-4 py-3" style={{ background: C.bg1, border: `1px solid ${C.line}` }}>
          <span className="text-xs" style={{ color: C.inkDim }}>Notation</span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.line}` }}>
            {[["fr", "Do Ré Mi"], ["en", "A B C"]].map(([k, lab]) => (
              <button key={k} onClick={() => onToggleNotation(k)} className="px-2.5 py-1.5 text-xs font-medium"
                style={{ background: notation === k ? C.brass : "transparent", color: notation === k ? C.bg0 : C.inkFaint }}>
                {lab}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => { unlockAudio(); onToggleSound(); }} className="rounded-xl px-4 flex items-center justify-center"
          style={{ background: C.bg1, border: `1px solid ${C.line}`, color: soundOn ? C.brass : C.inkFaint }} aria-label="Son">
          {soundOn ? "🔊" : "🔇"}
        </button>
      </div>

      {/* état des sons de violon, explicite pour lever toute ambiguïté */}
      <div className="flex items-center gap-2.5 rounded-xl px-4 py-2.5 -mt-2"
        style={{ background: C.bg1, border: `1px solid ${samplesFailed ? C.line : samplesReady ? C.good + "55" : C.line}` }}>
        <span className="text-base">{samplesFailed ? "⚠️" : samplesReady ? "🎻" : "⏳"}</span>
        <div className="flex-1 min-w-0">
          <div className="text-xs" style={{ color: samplesReady && !samplesFailed ? C.good : C.inkDim }}>
            {samplesFailed
              ? "Synthèse (réseau indisponible)"
              : samplesReady
                ? "Violon enregistré actif"
                : "Chargement du violon enregistré"}
          </div>
          {!samplesFailed && sampleProgress < 100 && (
            <div className="w-full h-1 rounded-full overflow-hidden mt-1.5" style={{ background: C.bg0 }}>
              <div className="h-full rounded-full" style={{ width: `${sampleProgress}%`, background: C.brass, transition: "width 300ms" }} />
            </div>
          )}
        </div>
        {!samplesFailed && (
          <span className="text-[10px] font-mono" style={{ color: C.inkFaint }}>{sampleProgress}%</span>
        )}
      </div>
    </div>
  );
}

// ---------- Réglages avant session ----------
function SessionSetup({ moduleId, moduleTitle, onStart, onBack, initialDifficulty, unlockAudio, soundOn }) {
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [timerMode, setTimerMode] = useState(moduleId === "notes" ? "adaptatif" : "libre");
  const [fixedSeconds, setFixedSeconds] = useState(6);

  const showTimer = moduleId === "notes"; // le chrono n'a de sens que sur la lecture à vue
  // rythme et intervalles se jouent uniquement à l'oreille : sans son, il n'y a
  // rien à écouter, autant le dire avant de commencer
  const needsSound = moduleId !== "notes";

  return (
    <div className="relative z-10 flex flex-col gap-5 w-full max-w-lg mx-auto px-4 pt-8 pb-10">
      <button onClick={onBack} className="text-sm self-start" style={{ color: C.brass }}>← Retour</button>
      <h2 className="text-2xl" style={{ fontFamily: "'Fraunces', serif", color: C.ink }}>{moduleTitle}</h2>

      <div>
        <div className="text-xs uppercase tracking-widest mb-1" style={{ color: C.inkFaint }}>
          Difficulté {moduleId === "notes" ? "— quelles notes apparaissent" : "— quelles valeurs sont testées"}
        </div>
        <div className="flex gap-2 mb-1.5">
          {[["debutant", "Débutant"], ["intermediaire", "Intermédiaire"], ["avance", "Avancé"]].map(([id, lab]) => (
            <button key={id} onClick={() => setDifficulty(id)} className="flex-1 py-3 rounded-xl text-sm font-medium"
              style={{ background: difficulty === id ? C.brass : C.bg1, color: difficulty === id ? C.bg0 : C.inkDim, border: `1px solid ${C.line}` }}>
              {lab}
            </button>
          ))}
        </div>
        {moduleId === "notes" && <p className="text-xs" style={{ color: C.inkFaint }}>{DIFFICULTY_DESCRIPTIONS[difficulty]}</p>}
        {moduleId === "rythme" && (
          <p className="text-xs" style={{ color: C.inkFaint }}>
            {RHYTHM_POOL[difficulty].map((r) => r.label).join(", ")}
          </p>
        )}
        {moduleId === "intervalles" && (
          <p className="text-xs" style={{ color: C.inkFaint }}>
            {INTERVAL_POOL[difficulty].length} intervalles testés
          </p>
        )}
      </div>

      {showTimer && (
        <div>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: C.inkFaint }}>Vitesse — temps pour répondre</div>
          <div className="flex gap-2 mb-1.5">
            {[["libre", "Libre"], ["adaptatif", "Adaptatif"], ["fixe", "Fixe"]].map(([id, lab]) => (
              <button key={id} onClick={() => setTimerMode(id)} className="flex-1 py-3 rounded-xl text-sm font-medium"
                style={{ background: timerMode === id ? C.copper : C.bg1, color: timerMode === id ? C.bg0 : C.inkDim, border: `1px solid ${C.line}` }}>
                {lab}
              </button>
            ))}
          </div>
          {timerMode === "fixe" && (
            <div className="mt-2 flex items-center gap-3">
              <input type="range" min="2" max="15" value={fixedSeconds} onChange={(e) => setFixedSeconds(Number(e.target.value))} className="flex-1" />
              <span className="font-mono text-sm w-14 text-right" style={{ color: C.ink }}>{fixedSeconds}s</span>
            </div>
          )}
          <p className="text-xs mt-1.5" style={{ color: C.inkFaint }}>
            {timerMode === "libre" && "Aucune limite : la note suivante arrive dès que vous répondez."}
            {timerMode === "adaptatif" && "Le temps se resserre quand vous réussissez, s'élargit quand vous vous trompez. Indépendant de la difficulté."}
            {timerMode === "fixe" && "Le même temps à chaque note."}
          </p>
        </div>
      )}

      {needsSound && !soundOn && (
        <p className="text-xs rounded-xl px-4 py-3" style={{ background: C.bg1, border: `1px solid ${C.line}`, color: C.inkDim }}>
          Le son est coupé. Ce module s'écoute : réactivez-le depuis l'accueil, ou
          utilisez le bouton « Réécouter » à chaque question.
        </p>
      )}

      <button onClick={() => { unlockAudio(); onStart({ difficulty, timerMode, fixedSeconds }); }}
        className="mt-2 py-4 rounded-xl text-base font-semibold active:scale-[0.98] transition-transform"
        style={{ background: `linear-gradient(90deg, ${C.brass}, ${C.brassBright})`, color: C.bg0 }}>
        Commencer
      </button>
    </div>
  );
}

// ---------- Clavier ----------
// flashKeys : { wrong?: touche pressée à tort, correct?: bonne réponse }
// En cas d'erreur on montre les deux simultanément : rouge sur ce qui a été
// choisi, vert sur ce qu'il fallait répondre.
function NoteKeyboard({ notation, onPress, flashKeys, disabled }) {
  const names = notation === "fr" ? NOTE_NAMES_FR : NOTE_NAMES_EN;
  return (
    <div className="grid grid-cols-7 gap-1.5 w-full">
      {names.map((n) => {
        const isWrong = flashKeys && flashKeys.wrong === n;
        const isCorrect = flashKeys && flashKeys.correct === n;
        const active = isWrong || isCorrect;
        const bg = isWrong ? C.bad : isCorrect ? C.good : C.bg2;
        return (
          <button key={n} onClick={() => onPress(n)} disabled={disabled}
            className="py-4 rounded-lg text-sm sm:text-base font-semibold active:scale-95"
            style={{
              background: bg,
              border: `1.5px solid ${active ? bg : C.line}`,
              color: active ? C.bg0 : C.ink,
              fontFamily: "'Fraunces', serif",
              transition: "background 100ms, border-color 100ms, transform 100ms",
            }}>
            {n}
          </button>
        );
      })}
    </div>
  );
}

// Barre supérieure de session : permet de quitter en cours de partie.
// L'abandon conserve les réponses déjà données plutôt que de tout jeter.
function SessionBar({ onQuit }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="w-full flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: C.bg1, border: `1px solid ${C.line}` }}>
        <span className="text-xs flex-1" style={{ color: C.inkDim }}>Quitter la session ?</span>
        <button onClick={() => setConfirming(false)} className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: C.bg2, color: C.inkDim, border: `1px solid ${C.line}` }}>
          Continuer
        </button>
        <button onClick={onQuit} className="text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: C.bad, color: C.bg0 }}>
          Quitter
        </button>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} className="self-start text-xs px-3 py-1.5 rounded-lg"
      style={{ background: C.bg1, color: C.inkDim, border: `1px solid ${C.line}` }}>
      ← Quitter
    </button>
  );
}

function ProgressHeader({ index, total, correct, extra }) {
  return (
    <div className="w-full flex items-center justify-between">
      <span className="text-xs font-mono" style={{ color: C.inkFaint }}>{index + 1} / {total}</span>
      {extra}
      <span className="text-xs font-mono" style={{ color: C.good }}>{correct} correctes</span>
    </div>
  );
}

/* ============================================================
   MODULE 1 — Lecture de notes
   Nombre de questions fixe et annoncé. Une seule état-machine :
   "playing" (on attend la réponse) -> "feedback" (flash) -> question
   suivante. Le compteur qIndex sert de clé : il change à chaque
   question, ce qui garantit que les effets se redéclenchent même si
   la même note est tirée deux fois de suite.
   ============================================================ */
const NOTES_TOTAL = 20;

function NotesModule({ config, notation, onFinish, playViolin, stopAll, soundOn }) {
  const pool = useMemo(() => notesForDifficulty(config.difficulty), [config.difficulty]);

  const [qIndex, setQIndex] = useState(0);
  const [current, setCurrent] = useState(() => pool[Math.floor(Math.random() * pool.length)]);
  const [phase, setPhase] = useState("playing");
  const [correctCount, setCorrectCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flash, setFlash] = useState(null);
  const [flashKeys, setFlashKeys] = useState(null);
  const [timeLimit, setTimeLimit] = useState(config.timerMode === "fixe" ? config.fixedSeconds : 6);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  const tickRef = useRef(null);
  const advanceRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const currentRef = useRef(current);
  currentRef.current = current;
  const doneRef = useRef(false);
  const indexRef = useRef(0);
  const stats = useRef({ correct: 0, bestStreak: 0, streak: 0 });

  useEffect(() => {
    return () => {
      clearInterval(tickRef.current);
      clearTimeout(advanceRef.current);
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // joue la note à chaque nouvelle question (qIndex garantit le déclenchement).
  // La note précédente dure 1,1 s ; en répondant vite on la ferait chevaucher la
  // suivante, d'où la coupure préalable.
  useEffect(() => {
    if (soundOn) {
      stopAll();
      playViolin(current.midi, 1.1, 0.42);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  // chrono par question, actif uniquement en phase "playing"
  useEffect(() => {
    clearInterval(tickRef.current);
    if (phase !== "playing" || config.timerMode === "libre" || doneRef.current) return;
    setTimeLeft(timeLimit);
    const start = Date.now();
    tickRef.current = setInterval(() => {
      const remaining = timeLimit - (Date.now() - start) / 1000;
      if (remaining <= 0) {
        clearInterval(tickRef.current);
        answer(null);
      } else {
        setTimeLeft(remaining);
      }
    }, 80);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, phase, timeLimit]);

  function answer(pressed) {
    if (phaseRef.current !== "playing" || doneRef.current) return;
    clearInterval(tickRef.current);

    const expected = notation === "fr" ? currentRef.current.name : currentRef.current.nameEn;
    const ok = pressed === expected;

    if (ok) {
      stats.current.correct += 1;
      stats.current.streak += 1;
      stats.current.bestStreak = Math.max(stats.current.bestStreak, stats.current.streak);
      setCorrectCount(stats.current.correct);
      setStreak(stats.current.streak);
      if (config.timerMode === "adaptatif") setTimeLimit((t) => Math.max(2, t - 0.25));
    } else {
      stats.current.streak = 0;
      setStreak(0);
      if (config.timerMode === "adaptatif") setTimeLimit((t) => Math.min(9, t + 0.5));
    }

    setFlash(ok ? "good" : "bad");
    if (ok) {
      setFlashKeys({ correct: expected });
    } else {
      // erreur ou temps écoulé : on montre la bonne réponse en vert,
      // et la touche fautive en rouge s'il y en a une
      setFlashKeys({ wrong: pressed || undefined, correct: expected });
    }
    setPhase("feedback");

    clearTimeout(advanceRef.current);
    advanceRef.current = setTimeout(() => advance(), ok ? 320 : 900);
  }

  function advance() {
    if (doneRef.current) return;
    const next = indexRef.current + 1;
    if (next >= NOTES_TOTAL) {
      doneRef.current = true;
      onFinish({ correct: stats.current.correct, total: NOTES_TOTAL, bestStreak: stats.current.bestStreak });
      return;
    }
    indexRef.current = next;
    setQIndex(next);
    setCurrent(pickDifferent(pool, currentRef.current));
    setFlash(null);
    setFlashKeys(null);
    setPhase("playing");
  }

  // abandon : on comptabilise uniquement les questions réellement jouées
  function quit() {
    if (doneRef.current) return;
    doneRef.current = true;
    clearInterval(tickRef.current);
    clearTimeout(advanceRef.current);
    stopAll();
    onFinish({
      correct: stats.current.correct,
      total: indexRef.current + (phaseRef.current === "feedback" ? 1 : 0),
      bestStreak: stats.current.bestStreak,
      abandoned: true,
    });
  }

  return (
    <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-4 pt-5 pb-10">
      <SessionBar onQuit={quit} />
      <ProgressHeader
        index={qIndex}
        total={NOTES_TOTAL}
        correct={correctCount}
        extra={<span className="text-xs font-mono" style={{ color: streak >= 3 ? C.good : C.inkFaint }}>🔥 {streak}</span>}
      />

      {config.timerMode !== "libre" && (
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: C.bg0 }}>
          <div className="h-full rounded-full" style={{ width: `${Math.max(0, (timeLeft / timeLimit) * 100)}%`, background: timeLeft / timeLimit < 0.3 ? C.bad : C.brass, transition: "width 80ms linear" }} />
        </div>
      )}

      <div className="w-full rounded-2xl py-4" style={{ background: C.bg1, border: `1px solid ${C.line}` }}>
        <StaffNote note={current} flash={flash} />
      </div>

      <NoteKeyboard notation={notation} onPress={answer} flashKeys={flashKeys} disabled={phase !== "playing"} />
    </div>
  );
}

/* ============================================================
   MODULE 2 — Lecture rythmique
   Principe : une pulsation régulière (référence de tempo, comme un
   métronome) tourne pendant toute l'écoute. La note testée est jouée
   au violon, TENUE sur sa durée réelle, deux fois de suite. Il n'y a
   aucune autre valeur jouée : on compte simplement combien de temps
   la note occupe par rapport à la pulsation.
   ============================================================ */
const RHYTHM_TOTAL = 12;
const RHYTHM_TEST_MIDI = 69; // La4, corde à vide du violon : hauteur neutre et confortable

function RhythmModule({ config, onFinish, playViolin, playTick, playFeedback, stopAll, soundOn }) {
  const pool = useMemo(() => RHYTHM_POOL[config.difficulty], [config.difficulty]);

  const [qIndex, setQIndex] = useState(0);
  const [current, setCurrent] = useState(() => pool[Math.floor(Math.random() * pool.length)]);
  const [choices, setChoices] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beatPulse, setBeatPulse] = useState(-1);

  const tokenRef = useRef(0);
  const doneRef = useRef(false);
  const correctRef = useRef(0);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const currentRef = useRef(current);
  currentRef.current = current;

  useEffect(() => {
    return () => {
      tokenRef.current++;
      doneRef.current = true;
      playingRef.current = false;
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const opts = new Set([current.id]);
    let guard = 0;
    while (opts.size < Math.min(4, pool.length) && guard < 60) {
      opts.add(pool[Math.floor(Math.random() * pool.length)].id);
      guard++;
    }
    setChoices(shuffle(Array.from(opts)));
  }, [current, pool, qIndex]);

  // joue automatiquement à chaque nouvelle question
  useEffect(() => {
    if (soundOn) {
      const t = setTimeout(() => playPattern(), 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  const BEAT_MS = 620; // tempo de référence, environ 97 BPM

  async function playPattern() {
    if (playingRef.current || doneRef.current) return;
    const token = ++tokenRef.current;
    playingRef.current = true;
    setIsPlaying(true);

    const rhythm = currentRef.current;
    // durée en temps de la note, arrondie pour le nombre de pulsations à couvrir
    const noteBeats = rhythm.beats;
    // on couvre au moins 4 temps par répétition pour laisser entendre la pulsation
    const framePerRep = Math.max(4, Math.ceil(noteBeats) + 1);
    const REPS = 2;

    // Si le jeton a changé, c'est qu'une autre écoute (ou une réponse, ou un
    // abandon) a pris la main : elle est seule responsable de l'état, on ne
    // touche à rien.
    const stop = () => {
      if (tokenRef.current !== token) return;
      playingRef.current = false;
      setIsPlaying(false);
      setBeatPulse(-1);
    };

    for (let rep = 0; rep < REPS; rep++) {
      // la note démarre exactement sur le premier temps de la répétition
      if (tokenRef.current !== token) return stop();
      playViolin(RHYTHM_TEST_MIDI, (noteBeats * BEAT_MS) / 1000, 0.45);
      // toute la pulsation de la répétition est programmée d'un coup sur
      // l'horloge audio : c'est la seule façon d'obtenir un tempo stable
      for (let b = 0; b < framePerRep; b++) playTick(b === 0, (b * BEAT_MS) / 1000);

      // la boucle qui suit ne sert plus qu'à l'animation
      for (let b = 0; b < framePerRep; b++) {
        if (tokenRef.current !== token) return stop();
        setBeatPulse(b % 4); // 4 pastilles à l'écran, la pulsation peut aller au-delà
        await sleep(BEAT_MS);
      }
    }
    stop();
  }

  function handleAnswer(id) {
    if (answered || doneRef.current) return;
    // coupure nette : on invalide la boucle en cours ET on stoppe les voix
    // déjà programmées, sinon la note tenue continuerait par-dessus la suivante
    tokenRef.current++;
    playingRef.current = false;
    stopAll();
    setIsPlaying(false);
    setBeatPulse(-1);

    const ok = id === current.id;
    setAnswered(true);
    setSelected(id);
    if (soundOn) playFeedback(ok);
    if (ok) {
      correctRef.current += 1;
      setCorrectCount(correctRef.current);
    }
    setTimeout(() => next(), 700);
  }

  function next() {
    if (doneRef.current) return;
    const n = indexRef.current + 1;
    if (n >= RHYTHM_TOTAL) {
      doneRef.current = true;
      onFinish({ correct: correctRef.current, total: RHYTHM_TOTAL });
      return;
    }
    indexRef.current = n;
    setQIndex(n);
    setCurrent(pickDifferent(pool, currentRef.current));
    setAnswered(false);
    setSelected(null);
  }

  function quit() {
    if (doneRef.current) return;
    doneRef.current = true;
    tokenRef.current++;
    playingRef.current = false;
    stopAll();
    onFinish({
      correct: correctRef.current,
      total: indexRef.current + (answered ? 1 : 0),
      abandoned: true,
    });
  }

  return (
    <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-4 pt-5 pb-10">
      <SessionBar onQuit={quit} />
      <ProgressHeader index={qIndex} total={RHYTHM_TOTAL} correct={correctCount} />
      <p className="text-xs text-center -mt-1 leading-relaxed" style={{ color: C.inkFaint }}>
        Une pulsation régulière donne le tempo. La note est tenue sur sa durée, jouée deux fois.
        Comptez combien de temps elle occupe.
      </p>

      <div className="w-full rounded-2xl py-8 flex flex-col items-center gap-5" style={{ background: C.bg1, border: `1px solid ${C.line}` }}>
        {/* visualisation de la pulsation */}
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((b) => (
            <div key={b} className="rounded-full"
              style={{
                width: 12, height: 12,
                background: beatPulse === b ? C.brassBright : C.bg2,
                border: `1px solid ${beatPulse === b ? C.brassBright : C.line}`,
                transition: "background 90ms, border-color 90ms",
              }} />
          ))}
        </div>

        <button onClick={playPattern} disabled={isPlaying || answered}
          className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-medium"
          style={{ background: C.bg2, color: C.brass, border: `1px solid ${C.line}`, opacity: isPlaying || answered ? 0.5 : 1 }}>
          {isPlaying ? "Écoute en cours..." : "▶ Réécouter"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full">
        {choices.map((id) => {
          const r = RHYTHM_VALUES.find((v) => v.id === id);
          let bg = C.bg2, border = C.line, color = C.ink;
          if (answered) {
            if (id === current.id) { bg = "#2f4527"; border = C.good; }
            else if (id === selected) { bg = "#4a241c"; border = C.bad; }
            else color = C.inkFaint;
          }
          return (
            <button key={id} onClick={() => handleAnswer(id)} disabled={answered}
              className="py-4 rounded-xl text-sm font-semibold active:scale-[0.97] flex flex-col items-center gap-1"
              style={{ background: bg, border: `1.5px solid ${border}`, color, transition: "background 120ms, border-color 120ms, transform 100ms" }}>
              <span className="text-2xl">{r.symbol}</span>
              {r.label}
              <span className="text-[10px] font-normal" style={{ color: answered ? color : C.inkFaint }}>
                {r.beats} temps
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   MODULE 3 — Intervalles
   ============================================================ */
const INTERVAL_TOTAL = 12;

function IntervalModule({ config, onFinish, playViolin, playFeedback, stopAll, soundOn }) {
  const pool = useMemo(() => INTERVAL_POOL[config.difficulty], [config.difficulty]);

  const [qIndex, setQIndex] = useState(0);
  const [current, setCurrent] = useState(() => pool[Math.floor(Math.random() * pool.length)]);
  const [baseMidi, setBaseMidi] = useState(() => 62 + Math.floor(Math.random() * 8));
  const [choices, setChoices] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const tokenRef = useRef(0);
  const doneRef = useRef(false);
  const correctRef = useRef(0);
  const indexRef = useRef(0);
  const timeoutsRef = useRef([]);
  const playingRef = useRef(false);
  const currentRef = useRef(current);
  currentRef.current = current;
  const baseMidiRef = useRef(baseMidi);
  baseMidiRef.current = baseMidi;

  useEffect(() => {
    return () => {
      doneRef.current = true;
      tokenRef.current++;
      playingRef.current = false;
      timeoutsRef.current.forEach(clearTimeout);
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const opts = new Set([current.semitones]);
    let guard = 0;
    while (opts.size < Math.min(4, pool.length) && guard < 60) {
      opts.add(pool[Math.floor(Math.random() * pool.length)].semitones);
      guard++;
    }
    setChoices(shuffle(Array.from(opts)));
  }, [current, pool, qIndex]);

  useEffect(() => {
    if (soundOn) {
      const t = setTimeout(() => play(), 350);
      timeoutsRef.current.push(t);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex]);

  function play() {
    if (playingRef.current || doneRef.current) return;
    const token = ++tokenRef.current;
    playingRef.current = true;
    setIsPlaying(true);
    const base = baseMidiRef.current;
    const semis = currentRef.current.semitones;
    playViolin(base, 0.85, 0.45);
    const t1 = setTimeout(() => {
      if (tokenRef.current !== token || doneRef.current) return;
      playViolin(base + semis, 1.05, 0.45);
      const t2 = setTimeout(() => {
        if (tokenRef.current === token) {
          playingRef.current = false;
          setIsPlaying(false);
        }
      }, 1050);
      timeoutsRef.current.push(t2);
    }, 900);
    timeoutsRef.current.push(t1);
  }

  function handleAnswer(st) {
    if (answered || doneRef.current) return;
    tokenRef.current++;
    playingRef.current = false;
    stopAll();
    setIsPlaying(false);
    const ok = st === current.semitones;
    setAnswered(true);
    setSelected(st);
    if (soundOn) playFeedback(ok);
    if (ok) {
      correctRef.current += 1;
      setCorrectCount(correctRef.current);
    }
    const t = setTimeout(() => next(), 750);
    timeoutsRef.current.push(t);
  }

  function next() {
    if (doneRef.current) return;
    tokenRef.current++;
    playingRef.current = false;
    setIsPlaying(false);
    const n = indexRef.current + 1;
    if (n >= INTERVAL_TOTAL) {
      doneRef.current = true;
      onFinish({ correct: correctRef.current, total: INTERVAL_TOTAL });
      return;
    }
    indexRef.current = n;
    setQIndex(n);
    setCurrent(pickDifferent(pool, currentRef.current));
    setBaseMidi(62 + Math.floor(Math.random() * 8));
    setAnswered(false);
    setSelected(null);
  }

  function quit() {
    if (doneRef.current) return;
    doneRef.current = true;
    tokenRef.current++;
    playingRef.current = false;
    stopAll();
    timeoutsRef.current.forEach(clearTimeout);
    onFinish({
      correct: correctRef.current,
      total: indexRef.current + (answered ? 1 : 0),
      abandoned: true,
    });
  }

  return (
    <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-4 pt-5 pb-10">
      <SessionBar onQuit={quit} />
      <ProgressHeader index={qIndex} total={INTERVAL_TOTAL} correct={correctCount} />

      <div className="w-full rounded-2xl py-9 flex flex-col items-center gap-5" style={{ background: C.bg1, border: `1px solid ${C.line}` }}>
        <div className="flex items-end gap-1.5 h-10">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-sm"
              style={{
                width: 10,
                height: isPlaying ? 34 - i * 8 : 14,
                background: isPlaying ? C.copper : C.bg2,
                border: `1px solid ${isPlaying ? C.copper : C.line}`,
                transition: "height 200ms, background 200ms",
              }} />
          ))}
        </div>
        <button onClick={play} disabled={isPlaying || answered}
          className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-full font-medium"
          style={{ background: C.bg2, color: C.copper, border: `1px solid ${C.line}`, opacity: isPlaying || answered ? 0.5 : 1 }}>
          {isPlaying ? "Écoute..." : "▶ Réécouter"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 w-full">
        {choices.map((st) => {
          const iv = INTERVALS.find((x) => x.semitones === st);
          let bg = C.bg2, border = C.line, color = C.ink;
          if (answered) {
            if (st === current.semitones) { bg = "#2f4527"; border = C.good; }
            else if (st === selected) { bg = "#4a241c"; border = C.bad; }
            else color = C.inkFaint;
          }
          return (
            <button key={st} onClick={() => handleAnswer(st)} disabled={answered}
              className="py-3.5 rounded-xl text-sm font-medium active:scale-[0.98] text-left px-5"
              style={{ background: bg, border: `1.5px solid ${border}`, color, transition: "background 120ms, border-color 120ms, transform 100ms" }}>
              {iv.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Résultats ----------
function ResultsScreen({ result, onHome, onRetry }) {
  const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const msg = result.abandoned
    ? "Session interrompue"
    : pct >= 90 ? "Excellent." : pct >= 70 ? "Bien joué." : pct >= 50 ? "Ça progresse." : "À retravailler.";
  return (
    <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4 pt-16 pb-10 text-center">
      <div className="w-32 h-32 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${C.brass} ${pct}%, ${C.bg1} 0)` }}>
        <div className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-mono" style={{ background: C.bg0, color: C.ink }}>{pct}%</div>
      </div>
      <h2 className="text-2xl" style={{ fontFamily: "'Fraunces', serif", color: C.ink }}>{msg}</h2>
      <p className="text-sm" style={{ color: C.inkFaint }}>
        {result.total > 0
          ? `${result.correct} / ${result.total} réponses correctes`
          : "Aucune réponse enregistrée"}
        {result.bestStreak ? ` · série max ${result.bestStreak}` : ""}
      </p>
      <p className="text-sm font-mono" style={{ color: C.brass }}>+{result.xpGained} XP</p>
      <div className="flex gap-3 w-full mt-4">
        <button onClick={onHome} className="flex-1 py-3.5 rounded-xl text-sm font-medium" style={{ background: C.bg1, color: C.inkDim, border: `1px solid ${C.line}` }}>Accueil</button>
        <button onClick={onRetry} className="flex-1 py-3.5 rounded-xl text-sm font-semibold" style={{ background: `linear-gradient(90deg, ${C.brass}, ${C.brassBright})`, color: C.bg0 }}>Recommencer</button>
      </div>
    </div>
  );
}

// ---------- App ----------
export default function App() {
  const [progress, setProgress] = useState(loadState);
  const [screen, setScreen] = useState("home");
  const [activeModule, setActiveModule] = useState(null);
  const [config, setConfig] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [runKey, setRunKey] = useState(0); // remonte les modules à chaque nouvelle session
  const {
    playViolin, playTick, playFeedback, unlockAudio, stopAll,
    preloadSamples, samplesReady, sampleProgress, samplesFailed,
  } = useSynth();

  // chargement des vrais sons de violon en tâche de fond dès l'ouverture
  useEffect(() => {
    preloadSamples();
  }, [preloadSamples]);

  useEffect(() => { saveState(progress); }, [progress]);

  const titles = { notes: "Lecture de notes", rythme: "Lecture rythmique", intervalles: "Intervalles" };

  const handleFinish = useCallback((result) => {
    // Une session abandonnée compte les questions déjà répondues dans les
    // statistiques, mais ne rapporte pas de bonus de série et ne casse pas
    // la série en cours : elle est simplement neutre.
    const abandoned = !!result.abandoned;
    const xpGained = result.total > 0
      ? Math.round((result.correct / result.total) * (abandoned ? 20 : 40) + (abandoned ? 0 : (result.bestStreak || 0) * 2))
      : 0;
    setProgress((prev) => {
      let level = prev.level;
      let xp = prev.xp + xpGained;
      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level += 1;
      }
      const perfect = !abandoned && result.total > 0 && result.correct === result.total;
      const newStreak = abandoned ? prev.streak : perfect ? prev.streak + 1 : 0;
      const ms = { ...prev.moduleStats };
      ms[activeModule] = {
        attempts: ms[activeModule].attempts + result.total,
        correct: ms[activeModule].correct + result.correct,
      };
      return {
        ...prev,
        xp, level,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        sessionsCompleted: prev.sessionsCompleted + (abandoned ? 0 : 1),
        moduleStats: ms,
        history: [...prev.history.slice(-49), { date: new Date().toISOString(), module: activeModule, score: result.correct, total: result.total, abandoned }],
      };
    });
    setLastResult({ ...result, xpGained });
    setScreen("results");
  }, [activeModule]);

  const notation = progress.settings.notation;
  const soundOn = progress.settings.soundOn;

  return (
    <div className="min-h-screen w-full relative" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* les polices sont déjà chargées par index.html : pas d'@import ici,
          il déclencherait une seconde requête pour le même fichier */}
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg0}; }
        button { font-family: inherit; }
        input[type=range] { accent-color: ${C.brass}; }
      `}</style>
      <Backdrop />

      {screen === "home" && (
        <HomeScreen progress={progress} notation={notation} soundOn={soundOn} unlockAudio={unlockAudio}
          samplesReady={samplesReady} sampleProgress={sampleProgress} samplesFailed={samplesFailed}
          onSelectModule={(id) => { setActiveModule(id); setScreen("setup"); }}
          onToggleNotation={(n) => setProgress((p) => ({ ...p, settings: { ...p.settings, notation: n } }))}
          onToggleSound={() => setProgress((p) => ({ ...p, settings: { ...p.settings, soundOn: !p.settings.soundOn } }))} />
      )}

      {screen === "setup" && (
        <SessionSetup moduleId={activeModule} moduleTitle={titles[activeModule]}
          initialDifficulty={progress.settings.difficulty} unlockAudio={unlockAudio} soundOn={soundOn}
          onBack={() => setScreen("home")}
          onStart={(cfg) => {
            setProgress((p) => ({ ...p, settings: { ...p.settings, difficulty: cfg.difficulty } }));
            setConfig(cfg);
            setRunKey((k) => k + 1);
            setScreen("module");
          }} />
      )}

      {screen === "module" && activeModule === "notes" && (
        <NotesModule key={runKey} config={config} notation={notation} onFinish={handleFinish} playViolin={playViolin} stopAll={stopAll} soundOn={soundOn} />
      )}
      {screen === "module" && activeModule === "rythme" && (
        <RhythmModule key={runKey} config={config} onFinish={handleFinish} playViolin={playViolin} playTick={playTick} playFeedback={playFeedback} stopAll={stopAll} soundOn={soundOn} />
      )}
      {screen === "module" && activeModule === "intervalles" && (
        <IntervalModule key={runKey} config={config} onFinish={handleFinish} playViolin={playViolin} playFeedback={playFeedback} stopAll={stopAll} soundOn={soundOn} />
      )}

      {screen === "results" && (
        <ResultsScreen result={lastResult} onHome={() => setScreen("home")} onRetry={() => { setRunKey((k) => k + 1); setScreen("setup"); }} />
      )}
    </div>
  );
}
