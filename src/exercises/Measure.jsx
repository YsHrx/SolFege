import React, { useCallback, useEffect, useRef, useState } from "react";
import { Staff } from "../ui/Glyphs.jsx";
import { Card } from "../ui/kit.jsx";
import {
  NOTE_EN, NOTE_FR, RANGES, noteName, staffPosition,
} from "../music/notes.js";
import { makePicker } from "../state/srs.js";
import { noteKeyOf } from "./NoteReading.jsx";

/* ============================================================
   LIRE UNE MESURE

   Quatre notes à la suite, répondues dans l'ordre. C'est la vraie
   compétence de lecture à vue : la note isolée ne s'y transfère qu'à
   moitié, parce qu'elle n'oblige jamais à tenir sa place dans une
   suite ni à repérer un intervalle d'un signe au suivant.

   La mesure ne compte comme réussie que si les quatre notes le sont —
   sinon on pourrait s'en tirer en devinant trois notes sur quatre.
   ============================================================ */

const LENGTH = 4;
const KEYS_FR = { d: "Do", r: "Ré", m: "Mi", f: "Fa", s: "Sol", l: "La", t: "Si" };
const KEYS_EN = { c: "C", d: "D", e: "E", f: "F", g: "G", a: "A", b: "B" };

export const measureKeyOf = (m) => `mesure:${m.map((n) => n.label).join("-")}`;

/* La mesure se joue d'un bloc mais s'enregistre note à note : c'est le
   Fa♯5 qui résiste, pas la combinaison des quatre. Le moteur reçoit donc
   les quatre verdicts, sous les mêmes clés que la lecture de notes. */
export const measureItemResults = (q, marks) =>
  q.seq.map((n, i) => ({
    key: noteKeyOf(n),
    ok: Array.isArray(marks) && marks[i] === "good",
  }));

export function makeMeasureDraw(difficulty, items, pool) {
  const notes = pool || RANGES[difficulty].notes;
  const pick = makePicker(notes, noteKeyOf, items);
  return () => {
    // On tire note à note, en évitant seulement la répétition immédiate :
    // une mesure faite de sauts aléatoires n'a rien de musical, mais une
    // mesure sans répétition force à lire chaque signe.
    const seq = [];
    let prev = null;
    for (let i = 0; i < LENGTH; i++) {
      const n = pick(prev ? { note: prev } : null);
      seq.push(n);
      prev = n;
    }
    return { key: measureKeyOf(seq), seq };
  };
}

/** La vue remonte les quatre marques ; la mesure n'est juste que si
    toutes le sont. */
export const measureIsCorrect = (q, v) =>
  Array.isArray(v) && v.length === q.seq.length && v.every((m) => m === "good");

export function MeasureView({ lesson, notation, audio, soundOn }) {
  const { question, phase, wasCorrect, submit, isAsking } = lesson;
  const seq = question.seq;
  const names = notation === "fr" ? NOTE_FR : NOTE_EN;

  const [step, setStep] = useState(0);
  const [marks, setMarks] = useState([]); // "good" | "bad" par note
  const settled = useRef(false);

  const stamp = `${lesson.index}:${question.key}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    setStep(0);
    setMarks([]);
    settled.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  const playAll = useCallback(() => {
    audio.stopAll();
    seq.forEach((n, i) => setTimeout(() => audio.playViolin(n.midi, 0.55, 0.4), i * 480));
  }, [audio, seq]);

  const answer = useCallback((name) => {
    if (!isAsking || settled.current) return;
    const expected = noteName(seq[step], notation);
    const ok = name === expected;
    const next = [...marks, ok ? "good" : "bad"];
    setMarks(next);
    if (soundOn) audio.playViolin(seq[step].midi, 0.45, 0.35);

    if (next.length >= LENGTH) {
      settled.current = true;
      // court délai : on laisse voir la dernière note se colorer
      setTimeout(() => submit(next), 380);
    } else {
      setStep(next.length);
    }
  }, [isAsking, marks, step, seq, notation, soundOn, audio, submit]);

  const onKey = useCallback((e) => {
    if (!isAsking || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "spacebar") { e.preventDefault(); playAll(); return; }
    const map = notation === "fr" ? KEYS_FR : KEYS_EN;
    let name = map[k];
    if (!name && k >= "1" && k <= "7") name = names[Number(k) - 1];
    if (name) { e.preventDefault(); answer(name); }
  }, [isAsking, notation, names, answer, playAll]);

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  const shake = phase === "feedback" && !wasCorrect;

  return (
    <>
      <Card sunk className={`w-full py-4 px-2 ${shake ? "anim-shake" : ""}`}>
        <Staff
          spacing={16}
          slots={LENGTH}
          notes={seq.map((n, i) => ({
            position: staffPosition(n),
            // la note en cours reste neutre ; celles déjà lues se colorent
            state: marks[i] || null,
          }))}
          ariaLabel={`Mesure de ${LENGTH} notes — note ${Math.min(step + 1, LENGTH)}`}
        />
        {/* le curseur : quelle note on lit en ce moment */}
        <div className="flex justify-center gap-2 mt-2" aria-hidden>
          {seq.map((_, i) => (
            <span key={i} style={{
              width: 9, height: 9, borderRadius: "50%",
              border: "2px solid var(--edge)",
              background: marks[i] === "good" ? "var(--moss)"
                : marks[i] === "bad" ? "var(--brick)"
                  : i === step ? "var(--mustard)" : "var(--paper)",
              transform: i === step && !marks[i] ? "scale(1.3)" : "scale(1)",
              transition: "background 140ms, transform 140ms",
            }} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-7 gap-1.5 w-full">
        {names.map((n, i) => (
          <button key={n} type="button" onClick={() => answer(n)}
            disabled={!isAsking || settled.current}
            className="btn"
            style={{
              padding: "0.85rem 0", fontSize: "0.95rem", borderRadius: 12,
              boxShadow: "0 4px 0 var(--edge)",
            }}>
            <span className="flex flex-col items-center leading-none gap-1">
              {n}
              <span className="mono" style={{ fontSize: 9, opacity: 0.5 }}>{i + 1}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="label text-center">
        Lisez les quatre notes dans l'ordre · Espace pour les entendre
      </p>
    </>
  );
}
