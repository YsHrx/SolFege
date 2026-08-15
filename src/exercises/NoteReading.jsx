import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Staff } from "../ui/Glyphs.jsx";
import { Card } from "../ui/kit.jsx";
import {
  NOTE_EN, NOTE_FR, noteName, staffPosition, RANGES,
} from "../music/notes.js";
import { makePicker } from "../state/srs.js";

/* ============================================================
   LECTURE DE NOTES

   Une note s'affiche sur la portée et se fait entendre. On répond sur
   sept touches — au doigt ou au clavier.
   ============================================================ */

/* Raccourcis clavier. Sans eux, l'exercice mesure la vitesse de la
   souris plutôt que celle de la lecture : à deux secondes par note, le
   déplacement du curseur devient le facteur limitant. */
const KEYS_FR = { d: "Do", r: "Ré", m: "Mi", f: "Fa", s: "Sol", l: "La", t: "Si" };
const KEYS_EN = { c: "C", d: "D", e: "E", f: "F", g: "G", a: "A", b: "B" };

export function noteKeyOf(note) {
  return `note:${note.label}`;
}

export function makeNoteDraw(difficulty, items, pool) {
  const notes = pool || RANGES[difficulty].notes;
  const pick = makePicker(notes, noteKeyOf, items);
  return (prev) => {
    const note = pick(prev ? prev.note : null);
    return { key: noteKeyOf(note), note };
  };
}

export function noteIsCorrect(q, value, notation) {
  return value === noteName(q.note, notation);
}

export function NoteReadingView({ lesson, notation, playNote, soundOn }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const note = question.note;
  const names = notation === "fr" ? NOTE_FR : NOTE_EN;
  const expected = noteName(note, notation);

  // rejoue à chaque nouvelle question ; la clé change même si la même
  // note ressort, donc l'effet se redéclenche bien
  const stamp = `${lesson.index}:${note.label}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    if (soundOn) playNote(note.midi);
  }, [stamp, soundOn, playNote, note.midi]);

  const onKey = useCallback((e) => {
    if (!isAsking || e.metaKey || e.ctrlKey || e.altKey) return;
    const map = notation === "fr" ? KEYS_FR : KEYS_EN;
    const k = e.key.toLowerCase();
    let answer = map[k];
    if (!answer && k >= "1" && k <= "7") answer = names[Number(k) - 1];
    if (k === " " || k === "spacebar") {
      e.preventDefault();
      playNote(note.midi);
      return;
    }
    if (answer) {
      e.preventDefault();
      submit(answer);
    }
  }, [isAsking, notation, names, submit, playNote, note.midi]);

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
            notes={[{ position: staffPosition(note), state }]}
            ariaLabel={
              phase === "feedback"
                ? `${note.label}. ${wasCorrect ? "Bonne réponse" : "Réponse attendue : " + expected}`
                : "Quelle est cette note ?"
            }
          />
        </div>
      </Card>

      <div className="grid grid-cols-7 gap-1.5 w-full">
        {names.map((n, i) => {
          const isWrong = phase === "feedback" && !wasCorrect && answered === n;
          const isRight = phase === "feedback" && n === expected;
          const bg = isWrong ? "var(--brick)" : isRight ? "var(--moss)" : "var(--paper-2)";
          const fg = isWrong || isRight ? "var(--on-color)" : "var(--ink)";
          return (
            <button
              key={n}
              type="button"
              onClick={() => submit(n)}
              disabled={!isAsking}
              className="btn"
              style={{
                padding: "0.85rem 0", fontSize: "0.95rem", borderRadius: 12,
                background: bg, color: fg,
                boxShadow: "0 4px 0 var(--edge)",
              }}
            >
              <span className="flex flex-col items-center leading-none gap-1">
                {n}
                <span className="mono" style={{ fontSize: 9, opacity: 0.5 }}>{i + 1}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="label text-center" style={{ letterSpacing: "0.06em" }}>
        Clavier : {notation === "fr" ? "D R M F S L T" : "C D E F G A B"} ou 1 à 7 · Espace pour réécouter
      </p>
    </>
  );
}
