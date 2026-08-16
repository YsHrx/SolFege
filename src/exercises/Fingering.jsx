import React, { useEffect, useRef } from "react";
import { Staff } from "../ui/Glyphs.jsx";
import { Card } from "../ui/kit.jsx";
import {
  POSITIONS, STRINGS, fingeringFor, positionByString, staffPosition,
} from "../music/notes.js";
import { makePicker } from "../state/srs.js";

/* ============================================================
   LE DOIGTÉ

   Une note s'affiche ; l'élève désigne la corde et le doigt sur un
   manche dessiné. C'est l'exercice propre au violon : lire une note ne
   sert à rien si l'on ne sait pas où la poser.

   Certaines notes se jouent à deux endroits — le Ré4 est la corde de Ré
   à vide ou le 4e doigt sur la corde de Sol. Les deux réponses sont
   acceptées, et la correction montre l'autre.
   ============================================================ */

/* La clé de mémoire porte la position : le Ré4 en 1re et le Ré4 en 3e
   ne demandent pas le même geste, et l'un peut être acquis quand
   l'autre ne l'est pas. */
export const fingeringKeyOf = (n, position = 1) => `doigte${position}:${n.label}`;

export function makeFingeringDraw(items, position = 1) {
  const byString = positionByString(position);
  const pool = byString.flatMap((s) => s.notes)
    .filter(Boolean)
    .filter((n, i, a) => a.findIndex((m) => m.label === n.label) === i);
  const key = (n) => fingeringKeyOf(n, position);
  const pick = makePicker(pool, key, items);
  return (prev) => {
    const note = pick(prev ? prev.note : null);
    return { key: key(note), note, position, answers: fingeringFor(note, position) };
  };
}

/** `value` vaut « corde:doigt ». Plusieurs positions peuvent être justes. */
export const fingeringIsCorrect = (q, value) =>
  q.answers.some((a) => `${a.string}:${a.finger}` === value);

/* ---------- le manche ---------- */
const W = 300;
const H = 250;
const NECK_TOP = 44;
const NECK_BOTTOM = 224;
const NECK_LEFT = 56;
const NECK_RIGHT = 268;
const FINGERS = [0, 1, 2, 3, 4];

/* Les doigts ne sont pas régulièrement espacés sur un violon : les
   demi-tons se resserrent. Les proportions ci-dessous reproduisent
   grossièrement une première position réelle. */
const FINGER_Y = [0, 0.22, 0.42, 0.6, 0.79];

export function FingerboardView({ lesson, audio, soundOn }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const note = question.note;
  const position = question.position || 1;
  const posLabel = (POSITIONS.find((p) => p.id === position) || POSITIONS[0]).label;

  const stamp = `${lesson.index}:${note.label}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    if (soundOn) { audio.stopAll(); audio.playViolin(note.midi, 1.0, 0.4); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  const answer = (stringId, finger) => {
    if (!isAsking) return;
    const v = `${stringId}:${finger}`;
    if (soundOn) audio.playFeedback(fingeringIsCorrect(question, v));
    submit(v);
  };

  const stringX = (i) => NECK_LEFT + (i * (NECK_RIGHT - NECK_LEFT)) / (STRINGS.length - 1);
  const fingerY = (f) => NECK_TOP + FINGER_Y[f] * (NECK_BOTTOM - NECK_TOP);

  const shake = phase === "feedback" && !wasCorrect;
  const chosen = phase === "feedback" ? answered : null;
  const rights = question.answers.map((a) => `${a.string}:${a.finger}`);

  return (
    <>
      <Card sunk className={`w-full py-3 px-2 ${shake ? "anim-shake" : ""}`}>
        <Staff spacing={15} notes={[{ position: staffPosition(note) }]}
          ariaLabel={`Où joue-t-on ${note.label} ?`} />
      </Card>

      <p className="label text-center">Corde et doigt, en {posLabel.toLowerCase()}</p>

      <Card className="w-full p-2">
        <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Manche du violon"
          style={{ display: "block", width: "100%", height: "auto" }}>
          {/* touche */}
          <rect x={NECK_LEFT - 26} y={NECK_TOP - 40} rx="16"
            width={NECK_RIGHT - NECK_LEFT + 52} height={NECK_BOTTOM - NECK_TOP + 64}
            fill="var(--sunk)" stroke="var(--edge)" strokeWidth="3" />

          {/* sillet : au-dessus des pastilles « corde à vide », sinon il
              passerait dessous et on ne le verrait plus */}
          <rect x={NECK_LEFT - 26} y={NECK_TOP - 40} rx="6"
            width={NECK_RIGHT - NECK_LEFT + 52} height="13" fill="var(--edge)" />

          {/* cordes : de plus en plus fines vers l'aigu */}
          {STRINGS.map((s, i) => (
            <line key={s.id} x1={stringX(i)} x2={stringX(i)}
              y1={NECK_TOP - 34} y2={NECK_BOTTOM + 12}
              stroke="var(--ink-3)" strokeWidth={4.4 - i * 0.8} strokeLinecap="round" />
          ))}

          {/* repère de position : en 2e et 3e, la main a glissé vers
              l'aigu, et le dire évite de chercher la 1re à tort */}
          {position > 1 && (
            <text x={W / 2} y={16} textAnchor="middle"
              style={{
                fontSize: 12, fontFamily: "PlexMono, monospace",
                fill: "var(--ink-3)", letterSpacing: "0.08em",
              }}>
              {posLabel.toUpperCase()}
            </text>
          )}

          {/* nom des cordes */}
          {STRINGS.map((s, i) => (
            <text key={s.id} x={stringX(i)} y={H - 4} textAnchor="middle"
              style={{
                fontSize: 13, fontFamily: "Baloo, sans-serif", fontWeight: 800,
                fill: s.color,
              }}>
              {s.label}
            </text>
          ))}

          {/* les cibles : cinq par corde */}
          {STRINGS.map((s, i) =>
            FINGERS.map((f) => {
              const v = `${s.id}:${f}`;
              const isChosen = chosen === v;
              const isRight = phase === "feedback" && rights.includes(v);
              const fill = isChosen && !isRight ? "var(--brick)"
                : isRight ? "var(--moss)"
                  : f === 0 ? "var(--paper)" : "var(--paper-2)";
              const label = f === 0 ? "0" : String(f);
              return (
                <g key={v} onClick={() => answer(s.id, f)}
                  style={{ cursor: isAsking ? "pointer" : "default" }}>
                  <circle cx={stringX(i)} cy={fingerY(f)} r="17"
                    fill={fill} stroke="var(--edge)" strokeWidth="2.8"
                    style={{ transition: "fill 140ms" }} />
                  <text x={stringX(i)} y={fingerY(f) + 5} textAnchor="middle"
                    style={{
                      fontSize: 14, fontFamily: "Baloo, sans-serif", fontWeight: 800,
                      fill: isChosen || isRight ? "var(--on-color)" : "var(--ink)",
                      pointerEvents: "none",
                    }}>
                    {label}
                  </text>
                </g>
              );
            })
          )}
        </svg>
      </Card>

      {phase === "feedback" && (
        <p className="text-sm text-center" style={{ color: wasCorrect ? "var(--moss)" : "var(--brick)" }}>
          {note.label} —{" "}
          {question.answers
            .map((a) => (a.finger === 0 ? `${a.stringLabel} à vide` : `${a.finger}e doigt sur ${a.stringLabel}`))
            .join(", ou ")}
        </p>
      )}
    </>
  );
}


