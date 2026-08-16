import React, { useCallback, useEffect, useRef, useState } from "react";
import { NoteFigure } from "../ui/Glyphs.jsx";
import { Btn, Card } from "../ui/kit.jsx";
import { RHYTHM_POOL, beatMsFor, rhythmById } from "../music/rhythm.js";
import { distractors, makePicker } from "../state/srs.js";

/* ============================================================
   LECTURE RYTHMIQUE

   Une pulsation régulière donne le tempo. La note testée est tenue sur
   sa durée réelle, deux fois de suite. Il n'y a aucune autre valeur
   jouée : il s'agit de compter combien de temps elle occupe.
   ============================================================ */

const TEST_MIDI = 69; // La4, corde à vide : hauteur neutre et confortable

export const rhythmKeyOf = (r) => `rythme:${r.id}`;

export function makeRhythmDraw(difficulty, items) {
  const pool = RHYTHM_POOL[difficulty];
  const pick = makePicker(pool, rhythmKeyOf, items);
  return (prev) => {
    const value = pick(prev ? prev.value : null);
    return {
      key: rhythmKeyOf(value),
      value,
      choices: distractors(pool, value, rhythmKeyOf, 3),
    };
  };
}

export const rhythmIsCorrect = (q, v) => v === q.value.id;

export function RhythmView({ lesson, audio, soundOn, bpm }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const [playing, setPlaying] = useState(false);
  const [beat, setBeat] = useState(-1);

  const tokenRef = useRef(0);
  const rafRef = useRef(0);
  const liveRef = useRef(question);
  liveRef.current = question;

  const stop = useCallback(() => {
    tokenRef.current += 1;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setBeat(-1);
  }, []);

  /* La pulsation visible est calée sur l'HORLOGE AUDIO, pas sur des
     minuteurs : les clics étant programmés sur cette horloge, une boucle
     `setTimeout` décrochait visiblement du son au bout de cinq ou six
     temps. */
  const play = useCallback(() => {
    if (tokenRef.current && playing) return;
    const token = ++tokenRef.current;
    setPlaying(true);

    const rhythm = liveRef.current.value;
    const beats = rhythm.beats;
    const perRep = Math.max(4, Math.ceil(beats) + 1);
    const REPS = 2;
    const beatS = beatMsFor(bpm) / 1000;
    const t0 = audio.audioNow();

    for (let rep = 0; rep < REPS; rep++) {
      const offset = rep * perRep * beatS;
      setTimeout(() => {
        if (tokenRef.current !== token) return;
        audio.playViolin(TEST_MIDI, beats * beatS, 0.45);
      }, offset * 1000);
      for (let b = 0; b < perRep; b++) {
        audio.playTick(b === 0, offset + b * beatS);
      }
    }

    const totalS = REPS * perRep * beatS;
    const loop = () => {
      if (tokenRef.current !== token) return;
      const elapsed = audio.audioNow() - t0;
      if (elapsed >= totalS) { stop(); return; }
      setBeat(Math.floor(elapsed / beatS) % perRep);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [audio, playing, stop, bpm]);

  // relance à chaque nouvelle question
  const stamp = `${lesson.index}:${question.value.id}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    stop();
    if (!soundOn) return undefined;
    const t = setTimeout(play, 320);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  useEffect(() => () => { tokenRef.current += 1; cancelAnimationFrame(rafRef.current); }, []);

  const answer = (id) => {
    stop();
    audio.stopAll();
    if (soundOn) audio.playFeedback(id === question.value.id);
    submit(id);
  };

  const perRepDots = Math.max(4, Math.ceil(question.value.beats) + 1);
  const shake = phase === "feedback" && !wasCorrect;

  return (
    <>
      <Card sunk className={`w-full py-7 flex flex-col items-center gap-5 ${shake ? "anim-shake" : ""}`}>
        <div className="flex gap-2" aria-hidden>
          {Array.from({ length: perRepDots }).map((_, b) => (
            <span key={b} style={{
              width: 13, height: 13, borderRadius: "50%",
              border: "2.5px solid var(--edge)",
              background: beat === b ? "var(--mustard)" : "var(--paper)",
              transform: beat === b ? "scale(1.25)" : "scale(1)",
              transition: "background 70ms, transform 90ms",
            }} />
          ))}
        </div>
        <Btn size="sm" onClick={play} disabled={playing || !isAsking}>
          {playing ? "Écoute…" : "▶ Réécouter"}
        </Btn>
      </Card>

      <div className="grid grid-cols-2 gap-2.5 w-full">
        {question.choices.map((r) => {
          const isWrong = phase === "feedback" && !wasCorrect && answered === r.id;
          const isRight = phase === "feedback" && r.id === question.value.id;
          const bg = isWrong ? "var(--brick)" : isRight ? "var(--moss)" : "var(--paper-2)";
          const fg = isWrong || isRight ? "var(--on-color)" : "var(--ink)";
          return (
            <button key={r.id} type="button" className="btn"
              onClick={() => answer(r.id)} disabled={!isAsking}
              style={{
                flexDirection: "column", gap: 6, padding: "0.9rem 0.5rem",
                background: bg, color: fg,
              }}>
              <span style={{ color: fg }}><NoteFigure value={r.id} size={42} /></span>
              <span style={{ fontSize: "0.9rem" }}>{r.label}</span>
              <span className="mono" style={{ fontSize: 10, opacity: 0.6 }}>
                {r.beats} temps
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

export { rhythmById };
