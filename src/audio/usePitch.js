import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   DÉTECTION DE HAUTEUR

   Autocorrélation normalisée sur le signal du micro. Le principe : on
   compare le signal à lui-même décalé de k échantillons ; le décalage
   qui maximise la ressemblance est la période, donc la fréquence.

   Deux précautions qui font toute la différence sur un violon :

   — on coupe les traitements du navigateur (annulation d'écho,
     réduction de bruit, gain automatique). Ils sont réglés pour la voix
     au téléphone et massacrent une note tenue ;
   — on écarte les octaves fantômes. L'autocorrélation trouve aussi un
     maximum à la moitié de la fréquence : si un pic presque aussi haut
     existe à la période moitié, c'est lui la vraie fondamentale.

   Le résultat est lissé sur quelques trames — sans cela l'aiguille
   tremble et l'élève court après un affichage plutôt qu'après une
   hauteur.
   ============================================================ */

const SIZE = 2048;
const MIN_HZ = 150;   // sous le Sol3 (196 Hz) avec de la marge
const MAX_HZ = 2200;  // au-dessus du Do7 (2093 Hz)
const CLARITY_MIN = 0.5;
const RMS_MIN = 0.008;

/** Renvoie la fréquence en Hz et une clarté de 0 à 1, ou null. */
export function detectPitch(buf, sampleRate) {
  const n = buf.length;

  // niveau : en dessous, c'est du silence ou du souffle
  let rms = 0;
  for (let i = 0; i < n; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / n);
  if (rms < RMS_MIN) return null;

  const minLag = Math.floor(sampleRate / MAX_HZ);
  const maxLag = Math.min(Math.floor(sampleRate / MIN_HZ), Math.floor(n / 2));

  // différence carrée normalisée : plus robuste que l'autocorrélation
  // brute, qui privilégie systématiquement les petits décalages
  let best = -1;
  let bestVal = 0;
  const nsdf = new Float32Array(maxLag + 1);

  for (let lag = minLag; lag <= maxLag; lag++) {
    let num = 0;
    let den = 0;
    for (let i = 0; i < n - lag; i++) {
      num += buf[i] * buf[i + lag];
      den += buf[i] * buf[i] + buf[i + lag] * buf[i + lag];
    }
    const v = den > 0 ? (2 * num) / den : 0;
    nsdf[lag] = v;
    if (v > bestVal) { bestVal = v; best = lag; }
  }

  if (best < 0 || bestVal < CLARITY_MIN) return null;

  // Octave fantôme : si un pic presque aussi bon existe à une période
  // moitié, c'est lui la fondamentale. Sans ce test, un violon sonne
  // régulièrement une octave trop haut.
  const half = Math.round(best / 2);
  if (half >= minLag && nsdf[half] > bestVal * 0.85) best = half;

  // interpolation parabolique : sans elle, la résolution plafonne à
  // plusieurs dizaines de cents dans l'aigu
  const y0 = nsdf[best - 1] ?? 0;
  const y1 = nsdf[best];
  const y2 = nsdf[best + 1] ?? 0;
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y2 - y0) / denom : 0;
  const period = best + shift;

  const hz = sampleRate / period;
  if (hz < MIN_HZ || hz > MAX_HZ) return null;
  return { hz, clarity: bestVal };
}

export const centsBetween = (hz, refHz) => 1200 * Math.log2(hz / refHz);

/* ============================================================
   MESURE AUTOUR D'UNE CIBLE

   Pour une double corde, l'autocorrélation ne suffit pas : elle ne
   renvoie qu'une hauteur, et deux notes sonnent en même temps.

   Mais on n'a pas besoin d'une détection polyphonique aveugle — on
   SAIT quelles deux notes sont attendues. Il suffit donc de chercher,
   autour de chaque fréquence cible, le pic du spectre et son écart.
   C'est à la fois plus simple et bien plus fiable.

   Une réserve demeure : à l'octave, la fondamentale de la note haute
   coïncide avec la deuxième harmonique de la note basse, et les deux
   deviennent indiscernables. Les octaves et unissons sont donc écartés
   de l'exercice plutôt que mal mesurés.
   ============================================================ */
const WINDOW_CENTS = 70;

/**
 * Cherche un pic autour de `targetHz` dans un spectre de magnitudes.
 * Renvoie l'écart en cents et la force du pic, ou null.
 */
export function measureAt(mag, sampleRate, fftSize, targetHz) {
  const binHz = sampleRate / fftSize;
  const lo = Math.max(1, Math.floor((targetHz * Math.pow(2, -WINDOW_CENTS / 1200)) / binHz));
  const hi = Math.min(mag.length - 2, Math.ceil((targetHz * Math.pow(2, WINDOW_CENTS / 1200)) / binHz));
  if (hi <= lo) return null;

  let best = lo;
  for (let i = lo; i <= hi; i++) if (mag[i] > mag[best]) best = i;
  // un pic sur le bord de la fenêtre n'en est pas un : la vraie crête
  // est ailleurs, la note cherchée n'est pas là
  if (best === lo || best === hi) return null;

  const y0 = mag[best - 1];
  const y1 = mag[best];
  const y2 = mag[best + 1];
  const denom = 2 * (2 * y1 - y0 - y2);
  const shift = denom !== 0 ? (y2 - y0) / denom : 0;
  const hz = (best + shift) * binHz;

  // force relative : la moyenne du spectre sert de plancher de bruit
  let sum = 0;
  for (let i = 0; i < mag.length; i++) sum += mag[i];
  const floor = sum / mag.length;
  const strength = floor > 0 ? y1 / floor : 0;

  return { hz, cents: centsBetween(hz, targetHz), strength };
}

/**
 * Ouvre le micro et suit la hauteur en continu.
 * `state` : "idle" | "asking" | "on" | "denied" | "unsupported"
 */
export function usePitchTracker() {
  const [state, setState] = useState("idle");
  const [reading, setReading] = useState(null); // { hz, clarity }

  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const bufRef = useRef(new Float32Array(SIZE));
  const smoothRef = useRef([]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {});
      ctxRef.current = null;
    }
    smoothRef.current = [];
    setReading(null);
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("unsupported"); return; }
    setState("asking");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch {
      setState("denied");
      return;
    }
    streamRef.current = stream;

    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = SIZE;
    src.connect(analyser);
    setState("on");

    const loop = () => {
      if (!ctxRef.current) return;
      analyser.getFloatTimeDomainData(bufRef.current);
      const r = detectPitch(bufRef.current, ctx.sampleRate);

      // lissage sur cinq trames : l'aiguille doit indiquer une hauteur,
      // pas trembler au rythme de la boucle d'animation
      const win = smoothRef.current;
      if (r) {
        win.push(r.hz);
        if (win.length > 5) win.shift();
        const sorted = [...win].sort((a, b) => a - b);
        setReading({ hz: sorted[Math.floor(sorted.length / 2)], clarity: r.clarity });
      } else {
        win.length = 0;
        setReading(null);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => stop, [stop]);

  return { state, reading, start, stop };
}

/* ============================================================
   SUIVI DE DEUX HAUTEURS

   Même ouverture de micro, mais on lit le spectre et on mesure autour
   de deux cibles connues.
   ============================================================ */
const FFT = 8192; // résolution fine : ~5 Hz par case à 44,1 kHz

export function useDoubleTracker(targets) {
  const [state, setState] = useState("idle");
  const [readings, setReadings] = useState([null, null]);

  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    setReadings([null, null]);
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("unsupported"); return; }
    setState("asking");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
    } catch { setState("denied"); return; }
    streamRef.current = stream;

    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = FFT;
    analyser.smoothingTimeConstant = 0.35;
    src.connect(analyser);
    setState("on");

    const db = new Float32Array(analyser.frequencyBinCount);
    const mag = new Float32Array(analyser.frequencyBinCount);

    const loop = () => {
      if (!ctxRef.current) return;
      analyser.getFloatFrequencyData(db);
      for (let i = 0; i < db.length; i++) mag[i] = Math.pow(10, db[i] / 20);
      const t = targetsRef.current || [];
      setReadings(t.map((hz) => {
        const r = measureAt(mag, ctx.sampleRate, FFT, hz);
        return r && r.strength > 6 ? r : null;
      }));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => stop, [stop]);

  return { state, readings, start, stop };
}
