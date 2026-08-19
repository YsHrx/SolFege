import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Btn, Card } from "../ui/kit.jsx";
import { Mascot } from "../ui/Mascot.jsx";
import { midiToFreq } from "../music/notes.js";
import {
  INTERVAL_BASE_MIN, INTERVAL_BASE_SPAN, INTERVAL_POOL,
} from "../music/intervals.js";
import { centsBetween, usePitchTracker } from "../audio/usePitch.js";
import { makePicker } from "../state/srs.js";

/* ============================================================
   PRODUIRE UN INTERVALLE

   On entend une fondamentale, on doit produire la note qui se trouve à
   l'intervalle demandé — à l'archet ou à la voix. Reconnaître un
   intervalle et le produire sont deux compétences différentes, et
   c'est la seconde qui sert quand on joue juste dans un accord.

   Tolérance plus large que l'accordeur : ±35 cents, tenus quatre
   dixièmes de seconde. La voix n'a pas la précision d'un doigt sur une
   corde, et l'exercice porte sur l'intervalle, pas sur la justesse
   absolue.
   ============================================================ */

const HOLD_MS = 400;
const GIVE_UP_MS = 20000;
const DECAY = 1.5;
/* La voix n'a pas la précision d'un doigt sur une corde, et l'exercice
   porte sur l'intervalle, pas sur la justesse absolue : on est plus
   large qu'à l'accordeur. */
const EXTRA = 10;

export const singKeyOf = (i) => `chanter:${i.semitones}`;

export function makeSingDraw(difficulty, items) {
  // au-delà de l'octave on sort de la tessiture confortable d'une voix
  const pool = INTERVAL_POOL[difficulty].filter((i) => i.semitones > 0);
  const pick = makePicker(pool, singKeyOf, items);
  return (prev) => {
    const interval = pick(prev ? prev.interval : null);
    return {
      key: singKeyOf(interval),
      interval,
      base: INTERVAL_BASE_MIN + Math.floor(Math.random() * INTERVAL_BASE_SPAN),
    };
  };
}

export const singIsCorrect = (q, v) => v === "juste";

export function SingIntervalView({ lesson, audio, soundOn, a4, tolerance }) {
  const { question, phase, wasCorrect, submit, isAsking } = lesson;
  const { base, interval } = question;
  const targetMidi = base + interval.semitones;
  const targetHz = useMemo(() => midiToFreq(targetMidi, a4), [targetMidi, a4]);
  const limit = tolerance + EXTRA;

  const { state, reading, start, stop } = usePitchTracker();
  const [held, setHeld] = useState(0);
  const holdRef = useRef(0);
  const lastTick = useRef(0);
  const startedAt = useRef(Date.now());
  const settled = useRef(false);

  // On accepte l'octave : chanter une quinte une octave plus bas reste
  // une quinte. Sans cela l'exercice serait infaisable pour une voix
  // grave face à une fondamentale aiguë.
  const cents = useMemo(() => {
    if (!reading) return null;
    const raw = centsBetween(reading.hz, targetHz);
    const folded = ((raw % 1200) + 1800) % 1200 - 600;
    return Math.abs(folded) < Math.abs(raw) ? folded : raw;
  }, [reading, targetHz]);

  const inTune = cents != null && Math.abs(cents) <= limit;

  const playRoot = useCallback(() => {
    audio.stopAll();
    audio.playViolin(base, 1.1, 0.45);
  }, [audio, base]);

  const stamp = `${lesson.index}:${interval.semitones}:${base}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    holdRef.current = 0;
    lastTick.current = 0;
    settled.current = false;
    startedAt.current = Date.now();
    setHeld(0);
    if (!soundOn) return undefined;
    const t = setTimeout(playRoot, 260);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  useEffect(() => {
    if (!isAsking || state !== "on" || settled.current) return;
    const now = Date.now();
    const dt = lastTick.current ? Math.min(120, now - lastTick.current) : 0;
    lastTick.current = now;
    holdRef.current = inTune
      ? holdRef.current + dt
      : Math.max(0, holdRef.current - dt * DECAY);
    setHeld(Math.min(1, holdRef.current / HOLD_MS));
    if (holdRef.current >= HOLD_MS) { settled.current = true; submit("juste"); }
  }, [cents, inTune, isAsking, state, submit]);

  /* Le compte à rebours d'abandon part de l'activation du micro, pas de
     l'affichage de l'écran. Sinon, quelqu'un qui prend le temps de lire
     la consigne, d'autoriser le micro et de sortir son violon voit sa
     première note comptée ratée à la seconde même où le micro s'ouvre. */
  useEffect(() => {
    if (state === "on") startedAt.current = Date.now();
  }, [state]);

  useEffect(() => {
    if (!isAsking || state !== "on") return undefined;
    const t = setInterval(() => {
      if (!settled.current && Date.now() - startedAt.current > GIVE_UP_MS) {
        settled.current = true;
        submit("rate");
      }
    }, 500);
    return () => clearInterval(t);
  }, [isAsking, state, submit, lesson.index]);

  useEffect(() => stop, [stop]);

  if (state !== "on") {
    return (
      <Card className="w-full p-5 flex flex-col items-center gap-4 text-center">
        <Mascot mood="ecoute" size={92} />
        <div>
          <div className="display" style={{ fontSize: "1.15rem" }}>Chantez, ou jouez</div>
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Vous entendrez une note, puis on vous demandera l'intervalle
            au-dessus. À l'archet ou à la voix, comme vous préférez. Le son est
            analysé sur l'appareil et n'est jamais enregistré.
          </p>
        </div>
        {state === "denied" && (
          <p className="text-sm" style={{ color: "var(--brick)" }}>
            L'accès au micro a été refusé. Autorisez-le dans les réglages du
            navigateur, puis réessayez.
          </p>
        )}
        <Btn tone="moss" onClick={start} disabled={state === "asking"}>
          {state === "asking" ? "Autorisation…" : "Activer le micro"}
        </Btn>
        <button type="button" onClick={() => submit("rate")}
          className="text-sm underline"
          style={{ background: "none", border: "none", color: "var(--ink-3)" }}>
          Passer
        </button>
      </Card>
    );
  }

  const shake = phase === "feedback" && !wasCorrect;
  const direction = cents == null ? null : cents < -limit ? "haut" : cents > limit ? "bas" : null;

  return (
    <>
      <Card sunk className={`w-full py-6 flex flex-col items-center gap-4 ${shake ? "anim-shake" : ""}`}>
        <span className="label">à partir de la note entendue</span>
        <span className="display" style={{ fontSize: "1.8rem", color: "var(--blue)" }}>
          {interval.name}
        </span>
        <Btn size="sm" onClick={playRoot} disabled={!isAsking}>
          ▶ Réentendre la fondamentale
        </Btn>
      </Card>

      {/* Pas d'aiguille en cents ici : afficher l'écart exact reviendrait à
          donner la réponse. On indique seulement le sens. */}
      <Card className="w-full p-4 flex flex-col items-center gap-3">
        <span style={{
          fontSize: "1.05rem", fontWeight: 600,
          color: inTune ? "var(--moss)" : reading ? "var(--ink-2)" : "var(--ink-3)",
        }}>
          {!reading ? "On vous écoute…"
            : inTune ? "C'est ça — tenez"
              : direction === "haut" ? "Plus haut"
                : "Plus bas"}
        </span>
        <div className="gauge w-full" style={{ height: 12 }}>
          <i style={{
            width: `${Math.max(2, held * 100)}%`,
            background: "var(--moss)",
            transition: "width 90ms linear",
          }} />
        </div>
      </Card>

      <button type="button" onClick={() => submit("rate")} disabled={!isAsking}
        className="text-sm underline"
        style={{ background: "none", border: "none", color: "var(--ink-3)" }}>
        Passer
      </button>

      {phase === "feedback" && (
        <p className="text-sm text-center" style={{ color: wasCorrect ? "var(--moss)" : "var(--brick)" }}>
          {interval.name} au-dessus
        </p>
      )}
    </>
  );
}
