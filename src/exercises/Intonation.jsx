import React, { useEffect, useMemo, useRef, useState } from "react";
import { Staff } from "../ui/Glyphs.jsx";
import { Btn, Card } from "../ui/kit.jsx";
import { Mascot } from "../ui/Mascot.jsx";
import { RANGES, midiToFreq, staffPosition } from "../music/notes.js";
import { centsBetween, usePitchTracker } from "../audio/usePitch.js";
import { makePicker } from "../state/srs.js";
import { noteKeyOf } from "./NoteReading.jsx";

/* ============================================================
   LA JUSTESSE

   Une note s'affiche ; l'élève la joue sur son violon et l'application
   écoute. C'est l'équivalent des exercices de prononciation de
   Duolingo, et c'est la fonctionnalité qui distingue réellement cet
   outil : partout ailleurs on répond à un quiz, ici on joue.

   Validation : il faut tenir la note dans une fenêtre de ±20 cents
   pendant six dixièmes de seconde. Un passage fugace ne compte pas —
   c'est la tenue qui prouve qu'on entend sa propre justesse.

   Rien de ce qui est capté ne sort du navigateur, et le flux est coupé
   dès qu'on quitte l'exercice.
   ============================================================ */

const TOLERANCE_CENTS = 20;
const HOLD_MS = 600;
const GIVE_UP_MS = 15000; // au-delà, on passe : mieux vaut avancer

export const intonationKeyOf = (n) => `justesse:${n.label}`;

export function makeIntonationDraw(difficulty, items, pool) {
  const notes = pool || RANGES[difficulty].notes;
  const pick = makePicker(notes, intonationKeyOf, items);
  return (prev) => {
    const note = pick(prev ? prev.note : null);
    return { key: intonationKeyOf(note), note };
  };
}

/** Le moteur reçoit « juste » ou « rate » : la décision est prise ici. */
export const intonationIsCorrect = (q, value) => value === "juste";

/* ---------- l'aiguille ---------- */
function Needle({ cents, active }) {
  // au-delà de 50 cents on est plus près de la note voisine : inutile
  // d'afficher davantage, l'aiguille se contente de buter
  const clamped = Math.max(-50, Math.min(50, cents ?? 0));
  const inTune = active && Math.abs(cents) <= TOLERANCE_CENTS;

  return (
    <div className="w-full">
      <div style={{
        position: "relative", height: 54,
        background: "var(--sunk)", border: "2.5px solid var(--edge)",
        borderRadius: 14, overflow: "hidden",
      }}>
        {/* la fenêtre de tolérance */}
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${50 - TOLERANCE_CENTS}%`, width: `${TOLERANCE_CENTS * 2}%`,
          background: "var(--moss)", opacity: inTune ? 0.3 : 0.14,
          transition: "opacity 160ms",
        }} />
        {/* le centre */}
        <div style={{
          position: "absolute", top: 6, bottom: 6, left: "50%", width: 3,
          marginLeft: -1.5, background: "var(--edge)", borderRadius: 2,
        }} />
        {/* l'aiguille */}
        {active && (
          <div style={{
            position: "absolute", top: 2, bottom: 2,
            left: `${50 + clamped}%`, width: 7, marginLeft: -3.5,
            background: inTune ? "var(--moss)" : "var(--brick)",
            border: "2.5px solid var(--edge)", borderRadius: 5,
            transition: "left 90ms linear, background 140ms",
          }} />
        )}
      </div>
      <div className="flex justify-between mt-1">
        <span className="label">trop bas</span>
        <span className="mono" style={{
          fontSize: "0.78rem",
          color: active ? (inTune ? "var(--moss)" : "var(--ink-2)") : "var(--ink-3)",
        }}>
          {active ? `${cents > 0 ? "+" : ""}${Math.round(cents)} cents` : "—"}
        </span>
        <span className="label">trop haut</span>
      </div>
    </div>
  );
}

export function IntonationView({ lesson, audio, soundOn }) {
  const { question, phase, wasCorrect, submit, isAsking } = lesson;
  const note = question.note;
  const target = useMemo(() => midiToFreq(note.midi), [note.midi]);

  const { state, reading, start, stop } = usePitchTracker();
  const [held, setHeld] = useState(0);
  const holdSince = useRef(null);
  const startedAt = useRef(Date.now());
  const settled = useRef(false);

  const cents = reading ? centsBetween(reading.hz, target) : null;
  const inTune = cents != null && Math.abs(cents) <= TOLERANCE_CENTS;

  // nouvelle question : on remet les compteurs, jamais le micro — le
  // rouvrir à chaque note redemanderait l'autorisation sur certains
  // navigateurs et couperait le son une demi-seconde
  const stamp = `${lesson.index}:${note.label}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    holdSince.current = null;
    settled.current = false;
    startedAt.current = Date.now();
    setHeld(0);
    if (soundOn) { audio.stopAll(); audio.playViolin(note.midi, 0.9, 0.34); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  // tenue de la note
  useEffect(() => {
    if (!isAsking || state !== "on" || settled.current) return;
    if (inTune) {
      if (holdSince.current == null) holdSince.current = Date.now();
      const t = Date.now() - holdSince.current;
      setHeld(Math.min(1, t / HOLD_MS));
      if (t >= HOLD_MS) {
        settled.current = true;
        submit("juste");
      }
    } else {
      holdSince.current = null;
      setHeld(0);
    }
  }, [inTune, isAsking, state, submit]);

  // filet de sécurité : on n'attend pas indéfiniment
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
          <div className="display" style={{ fontSize: "1.15rem" }}>Sortez le violon</div>
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            L'application écoute la note que vous jouez et vous dit si elle est
            juste. Le son est analysé sur l'appareil et n'est jamais enregistré
            ni envoyé nulle part.
          </p>
        </div>

        {state === "denied" && (
          <p className="text-sm" style={{ color: "var(--brick)" }}>
            L'accès au micro a été refusé. Autorisez-le dans les réglages du
            navigateur, puis réessayez.
          </p>
        )}
        {state === "unsupported" && (
          <p className="text-sm" style={{ color: "var(--brick)" }}>
            Ce navigateur ne donne pas accès au micro.
          </p>
        )}

        <Btn tone="moss" onClick={start} disabled={state === "asking"}>
          {state === "asking" ? "Autorisation…" : "Activer le micro"}
        </Btn>
        <button type="button" onClick={() => submit("rate")}
          className="text-sm underline"
          style={{ background: "none", border: "none", color: "var(--ink-3)" }}>
          Passer cette note
        </button>
      </Card>
    );
  }

  const shake = phase === "feedback" && !wasCorrect;

  return (
    <>
      <Card sunk className={`w-full py-3 px-2 ${shake ? "anim-shake" : ""}`}>
        <div className={phase === "feedback" && wasCorrect ? "anim-pop" : ""}>
          <Staff spacing={17}
            notes={[{
              position: staffPosition(note),
              state: phase === "feedback" ? (wasCorrect ? "good" : "bad") : null,
            }]}
            ariaLabel={`Jouez ${note.label}`} />
        </div>
      </Card>

      <div className="flex items-baseline gap-2">
        <span className="display" style={{ fontSize: "1.25rem" }}>{note.label}</span>
        <span className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-3)" }}>
          {target.toFixed(1)} Hz
        </span>
      </div>

      <Needle cents={cents} active={reading != null} />

      {/* la tenue : c'est elle qui valide, pas le passage fugace */}
      <div className="gauge w-full" style={{ height: 12 }}>
        <i style={{
          width: `${Math.max(2, held * 100)}%`,
          background: "var(--moss)",
          transition: "width 90ms linear",
        }} />
      </div>

      <p className="label text-center">
        {reading
          ? inTune ? "Tenez…" : "Ajustez le doigt"
          : "Jouez la note"}
      </p>

      <button type="button" onClick={() => submit("rate")} disabled={!isAsking}
        className="text-sm underline"
        style={{ background: "none", border: "none", color: "var(--ink-3)" }}>
        Passer
      </button>
    </>
  );
}
