import React, { useCallback, useEffect, useRef, useState } from "react";
import { Staff } from "../ui/Glyphs.jsx";
import { Card } from "../ui/kit.jsx";
import {
  NOTE_EN, NOTE_FR, makePitch, noteName, pitchKey, pitchMidi,
  pitchName, pitchSign, rangesFor, staffPositionIn, withAlterations,
} from "../music/notes.js";
import { makePicker } from "../state/srs.js";

/* ============================================================
   LECTURE DE NOTES

   Une note s'affiche sur la portée et se fait entendre. On répond sur
   sept touches — au doigt ou au clavier.

   Quand la leçon comporte des altérations, une rangée de trois
   modificateurs apparaît au-dessus du clavier. Elle reste cachée sinon :
   inutile d'imposer un geste de plus à qui n'a que des notes naturelles
   à lire.
   ============================================================ */

/* Raccourcis clavier. Sans eux, l'exercice mesure la vitesse de la
   souris plutôt que celle de la lecture : à deux secondes par note, le
   déplacement du curseur devient le facteur limitant. */
const KEYS_FR = { d: "Do", r: "Ré", m: "Mi", f: "Fa", s: "Sol", l: "La", t: "Si" };
const KEYS_EN = { c: "C", d: "D", e: "E", f: "F", g: "G", a: "A", b: "B" };

/** Clé de mémoire. Une hauteur altérée est un item distinct de sa
    naturelle : on peut très bien lire le Fa et buter sur le Fa♯. */
export const pitchKeyOf = (p) => `note:${pitchKey(p)}`;
export const noteKeyOf = (n) => `note:${n.label}`;

export function makeNoteDraw(difficulty, items, pool, options = {}) {
  const { alterations = false, clef = "sol" } = options;
  // sans sac imposé, on prend la tessiture de l'instrument correspondant
  // à la clef : celle du violon lue en clé d'ut serait hors portée
  const base = pool || rangesFor(clef)[difficulty].notes;
  const pitches = alterations ? withAlterations(base) : base.map((n) => makePitch(n, 0));
  const pick = makePicker(pitches, pitchKeyOf, items);
  return (prev) => {
    const pitch = pick(prev ? prev.pitch : null);
    return { key: pitchKeyOf(pitch), pitch, note: pitch.note, clef, alterations };
  };
}

/** La réponse est le nom complet : « Fa♯ » et « Fa » sont différents. */
export function noteIsCorrect(q, value, notation) {
  return value === pitchName(q.pitch, notation);
}

const MODIFIERS = [
  { alt: -1, sign: "♭", label: "bémol" },
  { alt: 0, sign: "♮", label: "bécarre" },
  { alt: 1, sign: "♯", label: "dièse" },
];

export function NoteReadingView({ lesson, notation, playNote, soundOn }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const pitch = question.pitch;
  const clef = question.clef || "sol";
  const names = notation === "fr" ? NOTE_FR : NOTE_EN;
  const expected = pitchName(pitch, notation);
  const withAlt = !!question.alterations;

  const [mod, setMod] = useState(0);

  // rejoue à chaque nouvelle question ; la clé change même si la même
  // hauteur ressort, donc l'effet se redéclenche bien
  const stamp = `${lesson.index}:${pitchKey(pitch)}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    setMod(0);
    if (soundOn) playNote(pitchMidi(pitch));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  const answerWith = useCallback((baseName, alt) => {
    const suffix = alt > 0 ? "♯" : alt < 0 ? "♭" : "";
    submit(baseName + suffix);
  }, [submit]);

  const onKey = useCallback((e) => {
    if (!isAsking || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();

    if (k === " " || k === "spacebar") {
      e.preventDefault();
      playNote(pitchMidi(pitch));
      return;
    }
    if (withAlt) {
      if (k === "+" || k === "#" || k === "arrowup") { e.preventDefault(); setMod(1); return; }
      if (k === "-" || k === "arrowdown") { e.preventDefault(); setMod(-1); return; }
      if (k === "0" || k === "arrowleft" || k === "arrowright") { e.preventDefault(); setMod(0); return; }
    }

    const map = notation === "fr" ? KEYS_FR : KEYS_EN;
    let name = map[k];
    if (!name && k >= "1" && k <= "7") name = names[Number(k) - 1];
    if (name) {
      e.preventDefault();
      answerWith(name, withAlt ? mod : 0);
    }
  }, [isAsking, notation, names, playNote, pitch, withAlt, mod, answerWith]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const state = phase === "feedback" ? (wasCorrect ? "good" : "bad") : null;
  const shake = phase === "feedback" && !wasCorrect;

  return (
    <>
      <Card sunk className={`w-full py-4 px-2 ${shake ? "anim-shake" : ""}`}>
        <div className={phase === "feedback" && wasCorrect ? "anim-pop" : ""}>
          <Staff
            spacing={17}
            clef={clef}
            notes={[{
              position: staffPositionIn(pitch.note, clef),
              accidental: pitchSign(pitch),
              state,
            }]}
            ariaLabel={
              phase === "feedback"
                ? `${expected}. ${wasCorrect ? "Bonne réponse" : "Réponse attendue : " + expected}`
                : "Quelle est cette note ?"
            }
          />
        </div>
      </Card>

      {withAlt && (
        <div className="flex gap-2 w-full">
          {MODIFIERS.map((m) => (
            <button key={m.alt} type="button" className="btn btn-sm"
              onClick={() => setMod(m.alt)} disabled={!isAsking}
              aria-pressed={mod === m.alt} aria-label={m.label}
              style={{
                flex: 1, fontSize: "1.15rem",
                background: mod === m.alt ? "var(--blue)" : "var(--paper-2)",
                color: mod === m.alt ? "var(--on-color)" : "var(--ink)",
              }}>
              {m.sign}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-7 gap-1.5 w-full">
        {names.map((n, i) => {
          const label = n + (withAlt && mod > 0 ? "♯" : withAlt && mod < 0 ? "♭" : "");
          const isWrong = phase === "feedback" && !wasCorrect && answered === label;
          const isRight = phase === "feedback" && expected.startsWith(n)
            && expected === n + (pitch.alt > 0 ? "♯" : pitch.alt < 0 ? "♭" : "");
          const bg = isWrong ? "var(--brick)" : isRight ? "var(--moss)" : "var(--paper-2)";
          const fg = isWrong || isRight ? "var(--on-color)" : "var(--ink)";
          return (
            <button key={n} type="button"
              onClick={() => answerWith(n, withAlt ? mod : 0)}
              disabled={!isAsking}
              className="btn"
              style={{
                padding: "0.85rem 0", fontSize: withAlt ? "0.82rem" : "0.95rem",
                borderRadius: 12, background: bg, color: fg,
                boxShadow: "0 4px 0 var(--edge)",
              }}>
              <span className="flex flex-col items-center leading-none gap-1">
                {label}
                <span className="mono" style={{ fontSize: 9, opacity: 0.5 }}>{i + 1}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="label text-center" style={{ letterSpacing: "0.06em" }}>
        {notation === "fr" ? "D R M F S L T" : "C D E F G A B"} ou 1 à 7
        {withAlt ? " · + et − pour l'altération" : ""} · Espace pour réécouter
      </p>
    </>
  );
}
