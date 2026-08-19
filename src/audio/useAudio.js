import { useCallback, useRef, useState } from "react";
import { A4_DEFAULT, A4_RANGE, midiToFreq } from "../music/notes.js";

/* ============================================================
   SON

   Trois sources, essayées dans cet ordre :
   1. les échantillons locaux de `public/samples` ;
   2. les mêmes fichiers sur un CDN public, en requête partielle ;
   3. une synthèse par formants, si le réseau ne répond pas du tout.

   Le métronome est programmé sur l'horloge audio et non sur des
   minuteurs JavaScript : un `setTimeout` dérive de plusieurs dizaines de
   millisecondes en quelques temps, ce qui s'entend.
   ============================================================ */

const SAMPLE_SOURCES = [
  { base: "/samples", partial: false },
  {
    base: "https://cdn.jsdelivr.net/gh/nbrosowsky/tonejs-instruments@master/samples/violin",
    partial: true,
  },
];

// Les fichiers du CDN durent 14 s ; la plus longue valeur du jeu, la ronde,
// n'en occupe que 2,5. On ne demande donc que le début du fichier — 80 ko,
// soit environ 3,4 s de son, marge comprise pour une ronde transposée.
const PARTIAL_BYTES = 81920;

const SAMPLE_MAP = [
  { midi: 55, file: "G3" }, { midi: 57, file: "A3" }, { midi: 60, file: "C4" },
  { midi: 64, file: "E4" }, { midi: 67, file: "G4" }, { midi: 69, file: "A4" },
  { midi: 72, file: "C5" }, { midi: 76, file: "E5" }, { midi: 79, file: "G5" },
  { midi: 81, file: "A5" }, { midi: 84, file: "C6" }, { midi: 88, file: "E6" },
  { midi: 91, file: "G6" }, { midi: 93, file: "A6" }, { midi: 96, file: "C7" },
];
const ANCHORS = SAMPLE_MAP.map((s) => s.midi);
const ANCHOR_FILE = new Map(SAMPLE_MAP.map((s) => [s.midi, s.file]));

/* Ordre de chargement : d'abord la tessiture couverte par la première
   position, où se joue l'essentiel ; les octaves aiguës ensuite. Les
   quinze ancrages finissent par être chargés, contrairement à la version
   précédente qui s'arrêtait à dix et laissait le haut du registre partir
   en synthèse. */
const CORE = [69, 76, 72, 67, 64, 60, 57, 55, 79, 81];
const EXTRA = [84, 88, 91, 93, 96];
const LOAD_ORDER = [...CORE, ...EXTRA];
const PRIORITY_COUNT = 4;

function nearestAnchor(midi) {
  let best = ANCHORS[0];
  let bestDist = Math.abs(midi - best);
  for (const a of ANCHORS) {
    const d = Math.abs(midi - a);
    if (d < bestDist) { best = a; bestDist = d; }
  }
  return best;
}

export function useAudio() {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctxRef.current = new AC();
    }
    return ctxRef.current;
  };

  const voicesRef = useRef([]);
  /* Le diapason. Les échantillons sont enregistrés à 440 : pour qu'un
     violon accordé à 442 entende la même hauteur que la sienne, on
     décale la vitesse de lecture d'autant. */
  const a4Ref = useRef(A4_DEFAULT);
  const setTuning = useCallback((hz) => {
    a4Ref.current = Math.min(A4_RANGE.max, Math.max(A4_RANGE.min, hz || A4_DEFAULT));
  }, []);
  const buffersRef = useRef(new Map());
  const inFlightRef = useRef(new Map());
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

      // forme à rappels : compatible avec les anciens Safari
      const decode = (arr) =>
        new Promise((resolve, reject) => ctx.decodeAudioData(arr, resolve, reject));

      let buf = null;
      for (const source of SAMPLE_SOURCES) {
        const url = `${source.base}/${file}.mp3`;
        if (source.partial) {
          try {
            const res = await fetch(url, { headers: { Range: `bytes=0-${PARTIAL_BYTES}` } });
            if (res.ok) buf = await decode(await res.arrayBuffer());
          } catch { buf = null; }
        }
        if (!buf) {
          try {
            const res = await fetch(url);
            if (res.ok) buf = await decode(await res.arrayBuffer());
          } catch { buf = null; }
        }
        if (buf) break;
      }
      if (!buf) throw new Error("échantillon indisponible : " + file);

      buffersRef.current.set(midi, buf);
      inFlightRef.current.delete(midi);
      setSamplesFailed(false);
      return buf;
    })();

    inFlightRef.current.set(midi, p);
    p.catch(() => inFlightRef.current.delete(midi));
    return p;
  }, []);

  const preload = useCallback(async () => {
    let loaded = 0;
    const track = () => {
      loaded += 1;
      setSampleProgress(Math.round((loaded / LOAD_ORDER.length) * 100));
      // On n'annonce « prêt » qu'une fois les quatre hauteurs prioritaires
      // en place. La version précédente le disait dès le premier fichier,
      // ce qui laissait la moitié des notes en synthèse sans le signaler.
      if (loaded >= PRIORITY_COUNT) setSamplesReady(true);
    };
    const priority = LOAD_ORDER.slice(0, PRIORITY_COUNT);
    const rest = LOAD_ORDER.slice(PRIORITY_COUNT);
    try {
      await Promise.all(priority.map((m) => loadAnchor(m).then(track, track)));
      if (buffersRef.current.size === 0) { setSamplesFailed(true); return; }
      // le reste en série, pour ne pas saturer une connexion mobile
      for (const m of rest) {
        try { await loadAnchor(m); } catch { /* la synthèse prendra le relais */ }
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
        // coupure douce sur 40 ms : une troncature nette ferait un clic
        v.gain.gain.cancelScheduledValues(t);
        v.gain.gain.setValueAtTime(Math.max(0.0001, v.gain.gain.value), t);
        v.gain.gain.linearRampToValueAtTime(0.0001, t + 0.04);
        v.nodes.forEach((n) => { try { n.stop(t + 0.05); } catch {} });
      } catch {}
    });
    voicesRef.current = [];
  }, []);

  const unlock = useCallback(() => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
  }, []);

  const noiseRef = useRef(null);
  const noiseBuffer = (ctx) => {
    if (!noiseRef.current) {
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseRef.current = buf;
    }
    return noiseRef.current;
  };

  const track = (voice, seconds) => {
    voicesRef.current.push(voice);
    setTimeout(() => {
      voicesRef.current = voicesRef.current.filter((v) => v !== voice);
    }, seconds * 1000);
  };

  /* Synthèse de secours : corde frottée = dents de scie riches en
     harmoniques, filtrées par les résonances du corps de l'instrument. */
  const playSynth = useCallback((midi, duration = 1.2, velocity = 0.5) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    const freq = midiToFreq(midi, a4Ref.current);

    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t0);
    const attack = 0.11;
    const release = Math.min(0.22, duration * 0.28);
    const sustainStart = t0 + attack;
    const releaseStart = t0 + Math.max(attack + 0.02, duration - release);
    out.gain.linearRampToValueAtTime(velocity * 1.08, sustainStart);
    out.gain.linearRampToValueAtTime(velocity * 0.92, sustainStart + 0.12);
    out.gain.setValueAtTime(velocity * 0.92, releaseStart);
    out.gain.linearRampToValueAtTime(0.0001, t0 + duration);
    out.connect(ctx.destination);

    const voice = { gain: out, nodes: [] };
    track(voice, duration + 0.2);

    const bus = ctx.createGain();
    bus.gain.value = 1;
    const FORMANTS = [
      { f: 280, q: 2.2, g: 0.5 },   // résonance d'air
      { f: 460, q: 3.0, g: 0.9 },   // résonance principale du bois
      { f: 800, q: 2.5, g: 0.55 },
      { f: 1300, q: 2.5, g: 0.4 },
      { f: 2500, q: 1.1, g: 0.65 }, // « bridge hill » : le mordant du violon
      { f: 3600, q: 1.4, g: 0.28 },
    ];
    FORMANTS.forEach((F) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = F.f;
      bp.Q.value = F.q;
      const g = ctx.createGain();
      g.gain.value = F.g;
      bus.connect(bp); bp.connect(g); g.connect(out);
    });
    const direct = ctx.createGain();
    direct.gain.value = 0.35;
    bus.connect(direct); direct.connect(out);

    const bright = ctx.createBiquadFilter();
    bright.type = "lowpass";
    bright.Q.value = 0.6;
    bright.frequency.setValueAtTime(Math.max(700, freq * 2), t0);
    bright.frequency.linearRampToValueAtTime(Math.min(9000, freq * 11), t0 + attack);
    bright.frequency.linearRampToValueAtTime(Math.min(6500, freq * 8), t0 + attack + 0.35);
    bright.connect(bus);

    // vibrato : absent à l'attaque, il s'installe comme celui d'un violoniste
    const vib = ctx.createOscillator();
    vib.type = "sine";
    vib.frequency.setValueAtTime(4.6, t0);
    vib.frequency.linearRampToValueAtTime(5.8, t0 + duration);
    const vibDepth = ctx.createGain();
    vibDepth.gain.setValueAtTime(0, t0);
    vibDepth.gain.linearRampToValueAtTime(0, t0 + 0.18);
    vibDepth.gain.linearRampToValueAtTime(freq * 0.011, t0 + Math.min(0.55, duration * 0.6));
    vib.connect(vibDepth);
    vib.start(t0); vib.stop(t0 + duration + 0.05);
    voice.nodes.push(vib);

    [-6.5, 0, 7.0].forEach((cents, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = cents;
      const g = ctx.createGain();
      g.gain.value = i === 1 ? 0.5 : 0.3;
      vibDepth.connect(osc.frequency);
      osc.connect(g); g.connect(bright);
      osc.start(t0); osc.stop(t0 + duration + 0.05);
      voice.nodes.push(osc);
    });

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer(ctx);
    noise.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 1800;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = Math.min(5200, freq * 6); bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t0);
    ng.gain.linearRampToValueAtTime(velocity * 0.16, t0 + 0.03);  // grattement d'attaque
    ng.gain.linearRampToValueAtTime(velocity * 0.025, t0 + 0.2);  // souffle résiduel
    ng.gain.setValueAtTime(velocity * 0.025, releaseStart);
    ng.gain.linearRampToValueAtTime(0.0001, t0 + duration);
    noise.connect(hp); hp.connect(bp); bp.connect(ng); ng.connect(out);
    noise.start(t0); noise.stop(t0 + duration + 0.05);
    voice.nodes.push(noise);
  }, []);

  const playSample = useCallback((buf, anchorMidi, midi, duration, velocity) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    // l'écart de diapason est un simple facteur sur la vitesse de lecture
    src.playbackRate.value =
      Math.pow(2, (midi - anchorMidi) / 12) * (a4Ref.current / A4_DEFAULT);

    // L'échantillon met environ 0,15 s à atteindre son plein niveau. C'est
    // réaliste, mais une double-croche serait alors inaudible : pour les
    // valeurs brèves on démarre dans la partie tenue.
    const offset = duration < 0.7 ? 0.16 : 0.02;
    const fadeIn = duration < 0.7 ? 0.008 : 0.02;
    const fadeOut = Math.min(0.16, duration * 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.linearRampToValueAtTime(velocity * 2.2, t0 + fadeIn);
    gain.gain.setValueAtTime(velocity * 2.2, t0 + Math.max(fadeIn, duration - fadeOut));
    gain.gain.linearRampToValueAtTime(0.0001, t0 + duration);

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start(t0, offset);
    src.stop(t0 + duration + 0.05);

    track({ gain, nodes: [src] }, duration + 0.2);
  }, []);

  const playViolin = useCallback((midi, duration = 1.2, velocity = 0.5) => {
    const anchor = nearestAnchor(midi);
    const buf = buffersRef.current.get(anchor);
    if (buf) { playSample(buf, anchor, midi, duration, velocity); return; }
    playSynth(midi, duration, velocity);
    loadAnchor(anchor).catch(() => {});
  }, [playSample, playSynth, loadAnchor]);

  /** Clic de métronome. `delay` programme à l'avance sur l'horloge audio. */
  const playTick = useCallback((accent = false, delay = 0) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + Math.max(0, delay);
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(accent ? 1500 : 1050, t0);
    osc.frequency.exponentialRampToValueAtTime(accent ? 700 : 520, t0 + 0.03);
    const g = ctx.createGain();
    g.gain.value = 0.0001; // silence avant t0 : une coupure anticipée repartirait de 1
    g.gain.setValueAtTime(accent ? 0.11 : 0.07, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.045);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + 0.05);
    track({ gain: g, nodes: [osc] }, delay + 0.2);
  }, []);

  const playFeedback = useCallback((correct) => {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime;
    const freqs = correct ? [660, 990] : [220, 165];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = correct ? "sine" : "triangle";
      osc.frequency.value = f;
      const s = t0 + i * 0.06;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.1, s + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.2);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(s); osc.stop(s + 0.22);
    });
  }, []);

  /** Petite fanfare de fin de leçon : un arpège ascendant au violon. */
  const playFanfare = useCallback(() => {
    [0, 4, 7, 12].forEach((s, i) => {
      setTimeout(() => playViolin(69 + s, 0.55, 0.4), i * 130);
    });
  }, [playViolin]);

  /** Le temps de l'horloge audio, pour caler une animation sur le son. */
  const audioNow = useCallback(() => (ctxRef.current ? ctxRef.current.currentTime : 0), []);

  return {
    playViolin, playTick, playFeedback, playFanfare,
    unlock, stopAll, preload, audioNow, setTuning,
    samplesReady, sampleProgress, samplesFailed,
  };
}
