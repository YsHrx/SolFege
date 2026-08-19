import React, { useEffect, useMemo, useRef, useState } from "react";
import { Staff } from "../ui/Glyphs.jsx";
import { Btn, Card } from "../ui/kit.jsx";
import { Mascot } from "../ui/Mascot.jsx";
import { STRINGS, doubleStops, midiToFreq, staffPosition } from "../music/notes.js";
import { useDoubleTracker } from "../audio/usePitch.js";
import { makePicker } from "../state/srs.js";

/* ============================================================
   DOUBLES CORDES

   Deux notes tenues ensemble, et l'application vérifie les deux. C'est
   là que la justesse compte vraiment : une note seule un peu haute
   passe inaperçue, la même dans une quinte fait battre l'accord.

   On écarte octaves et unissons : la fondamentale de la note haute y
   coïncide avec une harmonique de la note basse, et les deux
   deviennent indiscernables. Mieux vaut un exercice plus court que des
   mesures fausses.
   ============================================================ */

const HOLD_MS = 700;
const GIVE_UP_MS = 25000;
const DECAY = 1.5;

export const doubleKeyOf = (d) => `double:${d.low.label}+${d.high.label}`;

export function makeDoubleDraw(items, position = 1) {
  const pool = doubleStops(position).filter((d) => {
    const semis = d.high.midi - d.low.midi;
    return semis > 0 && semis !== 12 && semis !== 0 && semis <= 12;
  });
  const pick = makePicker(pool, doubleKeyOf, items);
  return (prev) => {
    const stop = pick(prev ? prev.stop : null);
    return { key: doubleKeyOf(stop), stop, position };
  };
}

export const doubleIsCorrect = (q, v) => v === "juste";

function MiniNeedle({ label, cents, active, tone, tolerance }) {
  const clamped = Math.max(-50, Math.min(50, cents ?? 0));
  const inTune = active && Math.abs(cents) <= tolerance;
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="mono" style={{ fontSize: "0.72rem", width: 42, color: tone }}>
        {label}
      </span>
      <div style={{
        position: "relative", height: 26, flex: 1,
        background: "var(--sunk)", border: "2.5px solid var(--edge)",
        borderRadius: 9, overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          left: `${50 - tolerance}%`, width: `${tolerance * 2}%`,
          background: "var(--moss)", opacity: inTune ? 0.32 : 0.14,
          transition: "opacity 160ms",
        }} />
        <div style={{
          position: "absolute", top: 3, bottom: 3, left: "50%", width: 2.5,
          marginLeft: -1.25, background: "var(--edge)", borderRadius: 2,
        }} />
        {active && (
          <div style={{
            position: "absolute", top: 2, bottom: 2,
            left: `${50 + clamped}%`, width: 6, marginLeft: -3,
            background: inTune ? "var(--moss)" : "var(--brick)",
            border: "2px solid var(--edge)", borderRadius: 4,
            transition: "left 90ms linear, background 140ms",
          }} />
        )}
      </div>
      <span className="mono" style={{
        fontSize: "0.68rem", width: 46, textAlign: "right",
        color: active ? (inTune ? "var(--moss)" : "var(--ink-2)") : "var(--ink-3)",
      }}>
        {!active ? "—"
          : Math.abs(cents) > 50 ? (cents < 0 ? "≪" : "≫")
            : `${cents > 0 ? "+" : ""}${Math.round(cents)}`}
      </span>
    </div>
  );
}

const stringColor = (id) => STRINGS.find((s) => s.id === id)?.color || "var(--ink)";
const fingerLabel = (f, label) => (f === 0 ? `${label} à vide` : `${f}e doigt sur ${label}`);

export function DoubleStopsView({ lesson, audio, soundOn, a4, tolerance }) {
  const { question, phase, wasCorrect, submit, isAsking } = lesson;
  const d = question.stop;

  const targets = useMemo(
    () => [midiToFreq(d.low.midi, a4), midiToFreq(d.high.midi, a4)],
    [d.low.midi, d.high.midi, a4]
  );
  const { state, readings, start, stop } = useDoubleTracker(targets);

  const [held, setHeld] = useState(0);
  const holdRef = useRef(0);
  const lastTick = useRef(0);
  const startedAt = useRef(Date.now());
  const settled = useRef(false);

  const bothInTune =
    !!readings[0] && !!readings[1]
    && Math.abs(readings[0].cents) <= tolerance
    && Math.abs(readings[1].cents) <= tolerance;

  const playRef = () => {
    audio.stopAll();
    audio.playViolin(d.low.midi, 1.6, 0.4);
    audio.playViolin(d.high.midi, 1.6, 0.4);
  };

  const stamp = `${lesson.index}:${question.key}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    holdRef.current = 0;
    lastTick.current = 0;
    settled.current = false;
    startedAt.current = Date.now();
    setHeld(0);
    if (soundOn) setTimeout(playRef, 260);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  // même accumulation avec décroissance que pour la note seule
  useEffect(() => {
    if (!isAsking || state !== "on" || settled.current) return;
    const now = Date.now();
    const dt = lastTick.current ? Math.min(120, now - lastTick.current) : 0;
    lastTick.current = now;
    holdRef.current = bothInTune
      ? holdRef.current + dt
      : Math.max(0, holdRef.current - dt * DECAY);
    setHeld(Math.min(1, holdRef.current / HOLD_MS));
    if (holdRef.current >= HOLD_MS) { settled.current = true; submit("juste"); }
  }, [readings, bothInTune, isAsking, state, submit]);

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
          <div className="display" style={{ fontSize: "1.15rem" }}>Deux cordes à la fois</div>
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Deux notes s'affichent, vous les tenez ensemble à l'archet, et
            l'application vérifie les deux hauteurs en même temps. Le son est
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

  return (
    <>
      <Card sunk className={`w-full py-3 px-2 ${shake ? "anim-shake" : ""}`}>
        <div className={phase === "feedback" && wasCorrect ? "anim-pop" : ""}>
          {/* les deux têtes sur le même emplacement : c'est un accord, pas
              une suite de deux notes */}
          <Staff
            spacing={17}
            slots={1}
            chord
            notes={[
              { position: staffPosition(d.low), state: phase === "feedback" ? (wasCorrect ? "good" : "bad") : null },
              { position: staffPosition(d.high), state: phase === "feedback" ? (wasCorrect ? "good" : "bad") : null },
            ]}
            ariaLabel={`Double corde ${d.low.label} et ${d.high.label}`}
          />
        </div>
      </Card>

      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="chip" style={{ color: stringColor(d.lowString) }}>
          {fingerLabel(d.lowFinger, STRINGS.find((s) => s.id === d.lowString).label)}
        </span>
        <span className="chip" style={{ color: stringColor(d.highString) }}>
          {fingerLabel(d.highFinger, STRINGS.find((s) => s.id === d.highString).label)}
        </span>
      </div>

      <Card className="w-full p-3 flex flex-col gap-2">
        <MiniNeedle label={d.low.label} tone={stringColor(d.lowString)}
          cents={readings[0]?.cents} active={!!readings[0]} tolerance={tolerance} />
        <MiniNeedle label={d.high.label} tone={stringColor(d.highString)}
          cents={readings[1]?.cents} active={!!readings[1]} tolerance={tolerance} />
        <div className="gauge w-full" style={{ height: 10, marginTop: 4 }}>
          <i style={{
            width: `${Math.max(2, held * 100)}%`, background: "var(--moss)",
            transition: "width 90ms linear",
          }} />
        </div>
        <span className="label text-center">
          {bothInTune ? "Les deux y sont — tenez"
            : readings[0] || readings[1] ? "Ajustez"
              : "Tenez les deux cordes"}
        </span>
      </Card>

      <div className="flex gap-2">
        <Btn size="sm" onClick={playRef} disabled={!isAsking}>▶ Entendre</Btn>
        <button type="button" onClick={() => submit("rate")} disabled={!isAsking}
          className="text-sm underline"
          style={{ background: "none", border: "none", color: "var(--ink-3)" }}>
          Passer
        </button>
      </div>
    </>
  );
}
