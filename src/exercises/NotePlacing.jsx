import React, { useEffect, useMemo, useRef, useState } from "react";
import { GLYPH, ENGRAVING } from "../ui/notation.js";
import { Btn, Card } from "../ui/kit.jsx";
import {
  ALL_NOTES, RANGES, noteName, staffPosition,
} from "../music/notes.js";
import { makePicker } from "../state/srs.js";
import { noteKeyOf } from "./NoteReading.jsx";

/* ============================================================
   POSER UNE NOTE SUR LA PORTÉE

   La même interaction sert deux exercices :

   — « écrire »  : on donne le nom, l'élève place la note. C'est
     l'inverse de la lecture, et ça travaille l'autre sens du lien
     nom ↔ position, qui ne se transfère qu'à moitié.
   — « écouter » : la note est jouée mais pas affichée, l'élève la
     place. Dans l'exercice de lecture, la note est montrée ET jouée en
     même temps : l'oreille n'y travaille jamais seule.

   La portée entière est cliquable, un degré à la fois. Une note
   fantôme suit le curseur pour montrer où l'on va poser.
   ============================================================ */

const U = 10;

export function makePlacingDraw(difficulty, items, pool, mode) {
  const notes = pool || RANGES[difficulty].notes;
  const pick = makePicker(notes, noteKeyOf, items);
  return (prev) => {
    const note = pick(prev ? prev.note : null);
    return { key: noteKeyOf(note), note, mode };
  };
}

export const placingIsCorrect = (q, value) => value === staffPosition(q.note);

/** Portée interactive : chaque degré est une cible. */
function StaffPicker({ min, max, spacing = 20, onPick, disabled, answer, correct, ghostOnly }) {
  const [hover, setHover] = useState(null);
  const k = spacing / U;

  // marge : la clef déborde, et les lignes supplémentaires aussi
  const padTop = Math.max(1.5, (max - 8) / 2 + 1.4) + 0.4;
  const padBottom = Math.max(2.7, -min / 2 + 1.4) + 0.4;

  const topLineY = padTop * spacing;
  const bottomLineY = topLineY + 4 * spacing;
  const height = bottomLineY + padBottom * spacing;
  const yOf = (p) => bottomLineY - (p * spacing) / 2;

  const clefW = GLYPH.gClef.box[2] * k;
  const leftPad = spacing * 0.5;
  const zoneStart = leftPad + clefW + spacing * 1.4;
  const width = zoneStart + spacing * 5;
  const noteX = zoneStart + spacing * 2;

  const degrees = [];
  for (let p = min; p <= max; p++) degrees.push(p);

  const shown = answer != null ? answer : hover;

  const ledgersFor = (p) => {
    const out = [];
    if (p < 0) for (let q = -2; q >= p; q -= 2) out.push(q);
    else if (p > 8) for (let q = 10; q <= p; q += 2) out.push(q);
    return out;
  };

  const headRx = (GLYPH.noteheadBlack.box[2] * k) / 2;
  const ledgerHalf = headRx + ENGRAVING.ledgerExtension * k;

  return (
    <svg
      viewBox={`0 0 ${Math.round(width)} ${Math.round(height)}`}
      style={{
        display: "block", width: "100%", maxWidth: Math.round(width),
        height: "auto", margin: "0 auto", touchAction: "manipulation",
        cursor: disabled ? "default" : "pointer",
      }}
      role="group"
      aria-label="Portée — choisissez la hauteur"
      onMouseLeave={() => setHover(null)}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const y = topLineY + i * spacing;
        return (
          <rect key={i} x="0" y={y - (ENGRAVING.staffLine * k) / 2} width={width}
            height={ENGRAVING.staffLine * k} fill="var(--ink)" />
        );
      })}

      <g transform={`translate(${leftPad} ${yOf(2)}) scale(${k})`} color="var(--ink)">
        <path d={GLYPH.gClef.d} fill="currentColor" />
      </g>

      {/* note posée, ou fantôme sous le curseur */}
      {shown != null && (
        <g color={
          answer != null
            ? (correct === null ? "var(--ink)" : correct ? "var(--moss)" : "var(--brick)")
            : "var(--ink-3)"
        } opacity={answer != null ? 1 : 0.5}>
          {ledgersFor(shown).map((q) => (
            <rect key={q} x={noteX - ledgerHalf}
              y={yOf(q) - (ENGRAVING.ledgerLine * k) / 2}
              width={ledgerHalf * 2} height={ENGRAVING.ledgerLine * k} fill="var(--ink)" />
          ))}
          <g transform={`translate(${noteX - headRx} ${yOf(shown)}) scale(${k})`}>
            <path d={GLYPH.noteheadBlack.d} fill="currentColor" />
          </g>
        </g>
      )}

      {/* la bonne réponse, en vert, quand on s'est trompé */}
      {answer != null && correct === false && ghostOnly != null && ghostOnly !== answer && (
        <g color="var(--moss)">
          {ledgersFor(ghostOnly).map((q) => (
            <rect key={q} x={noteX + spacing * 1.9 - ledgerHalf}
              y={yOf(q) - (ENGRAVING.ledgerLine * k) / 2}
              width={ledgerHalf * 2} height={ENGRAVING.ledgerLine * k} fill="var(--moss)" />
          ))}
          <g transform={`translate(${noteX + spacing * 1.9 - headRx} ${yOf(ghostOnly)}) scale(${k})`}>
            <path d={GLYPH.noteheadBlack.d} fill="currentColor" />
          </g>
        </g>
      )}

      {/* cibles : une bande par degré, sur toute la largeur utile */}
      {!disabled && degrees.map((p) => (
        <rect key={p}
          x={zoneStart - spacing} y={yOf(p) - spacing / 4}
          width={width - zoneStart + spacing} height={spacing / 2}
          fill="transparent"
          onMouseEnter={() => setHover(p)}
          onClick={() => onPick(p)}
        />
      ))}
    </svg>
  );
}

export function NotePlacingView({ lesson, notation, audio, soundOn, pool }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const note = question.note;
  const target = staffPosition(note);

  // l'étendue cliquable couvre le sac de la leçon, avec un degré de marge
  const bounds = useMemo(() => {
    const ps = (pool && pool.length ? pool : RANGES.avance.notes).map(staffPosition);
    return { min: Math.min(...ps) - 1, max: Math.max(...ps) + 1 };
  }, [pool]);

  const stamp = `${lesson.index}:${note.label}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    if (question.mode === "ecouter" && soundOn) {
      audio.stopAll();
      audio.playViolin(note.midi, 1.1, 0.42);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  const pick = (p) => {
    if (!isAsking) return;
    if (soundOn && question.mode === "ecrire") {
      const chosen = ALL_NOTES.find((n) => staffPosition(n) === p);
      if (chosen) audio.playViolin(chosen.midi, 0.7, 0.35);
    }
    if (soundOn) audio.playFeedback(p === target);
    submit(p);
  };

  const shake = phase === "feedback" && !wasCorrect;

  return (
    <>
      <Card sunk className={`w-full py-3 px-2 ${shake ? "anim-shake" : ""}`}>
        {question.mode === "ecouter" ? (
          <div className="flex flex-col items-center gap-2 mb-2">
            <Btn size="sm" onClick={() => audio.playViolin(note.midi, 1.1, 0.42)}
              disabled={!isAsking}>
              ▶ Réécouter
            </Btn>
          </div>
        ) : (
          <div className="text-center mb-2">
            <span className="display" style={{ fontSize: "1.9rem" }}>
              {noteName(note, notation)}<sub style={{ fontSize: "0.55em", opacity: 0.55 }}>{note.octave}</sub>
            </span>
          </div>
        )}

        <div className={phase === "feedback" && wasCorrect ? "anim-pop" : ""}>
          <StaffPicker
            min={bounds.min}
            max={bounds.max}
            onPick={pick}
            disabled={!isAsking}
            answer={phase === "feedback" ? answered : null}
            correct={phase === "feedback" ? wasCorrect : null}
            ghostOnly={target}
          />
        </div>
      </Card>

      <p className="label text-center">
        {question.mode === "ecouter"
          ? "Écoutez, puis posez la note sur la portée"
          : "Posez la note demandée sur la portée"}
      </p>

      {phase === "feedback" && !wasCorrect && (
        <p className="text-sm" style={{ color: "var(--brick)" }}>
          C'était {note.label} — la note verte
        </p>
      )}
    </>
  );
}
