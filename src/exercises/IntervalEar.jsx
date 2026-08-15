import React, { useCallback, useEffect, useRef, useState } from "react";
import { Btn, Card } from "../ui/kit.jsx";
import {
  INTERVAL_BASE_MIN, INTERVAL_BASE_SPAN, INTERVAL_POOL,
} from "../music/intervals.js";
import { distractors, makePicker } from "../state/srs.js";

/* ============================================================
   INTERVALLES

   Deux notes jouées l'une après l'autre depuis une fondamentale tirée
   entre Ré4 et La4. On nomme l'intervalle.
   ============================================================ */

export const intervalKeyOf = (i) => `intervalle:${i.semitones}`;

export function makeIntervalDraw(difficulty, items) {
  const pool = INTERVAL_POOL[difficulty];
  const pick = makePicker(pool, intervalKeyOf, items);
  return (prev) => {
    const interval = pick(prev ? prev.interval : null);
    return {
      key: intervalKeyOf(interval),
      interval,
      base: INTERVAL_BASE_MIN + Math.floor(Math.random() * INTERVAL_BASE_SPAN),
      choices: distractors(pool, interval, intervalKeyOf, 3),
    };
  };
}

export const intervalIsCorrect = (q, v) => v === q.interval.semitones;

export function IntervalView({ lesson, audio, soundOn }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const [playing, setPlaying] = useState(false);
  const [voice, setVoice] = useState(-1);

  const tokenRef = useRef(0);
  const timers = useRef([]);
  const liveRef = useRef(question);
  liveRef.current = question;

  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const stop = useCallback(() => {
    tokenRef.current += 1;
    clear();
    setPlaying(false);
    setVoice(-1);
  }, []);

  const play = useCallback(() => {
    if (playing) return;
    const token = ++tokenRef.current;
    setPlaying(true);
    const q = liveRef.current;

    setVoice(0);
    audio.playViolin(q.base, 0.85, 0.45);
    timers.current.push(setTimeout(() => {
      if (tokenRef.current !== token) return;
      setVoice(1);
      audio.playViolin(q.base + q.interval.semitones, 1.05, 0.45);
      timers.current.push(setTimeout(() => {
        if (tokenRef.current !== token) return;
        setPlaying(false);
        setVoice(-1);
      }, 1050));
    }, 900));
  }, [audio, playing]);

  const stamp = `${lesson.index}:${question.interval.semitones}:${question.base}`;
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

  useEffect(() => () => { tokenRef.current += 1; clear(); }, []);

  const answer = (semi) => {
    stop();
    audio.stopAll();
    if (soundOn) audio.playFeedback(semi === question.interval.semitones);
    submit(semi);
  };

  const shake = phase === "feedback" && !wasCorrect;

  return (
    <>
      <Card sunk className={`w-full py-9 flex flex-col items-center gap-5 ${shake ? "anim-shake" : ""}`}>
        {/* deux barres : la première note, puis la seconde */}
        <div className="flex items-end gap-2" style={{ height: 46 }} aria-hidden>
          {[0, 1].map((i) => (
            <span key={i} style={{
              width: 15,
              height: voice === i ? 42 : 16,
              background: voice === i ? "var(--blue)" : "var(--paper)",
              border: "2.5px solid var(--edge)",
              borderRadius: 5,
              transition: "height 180ms cubic-bezier(.34,1.56,.64,1), background 180ms",
            }} />
          ))}
        </div>
        <Btn size="sm" onClick={play} disabled={playing || !isAsking}>
          {playing ? "Écoute…" : "▶ Réécouter"}
        </Btn>
      </Card>

      <div className="grid grid-cols-1 gap-2 w-full">
        {question.choices.map((iv) => {
          const isWrong = phase === "feedback" && !wasCorrect && answered === iv.semitones;
          const isRight = phase === "feedback" && iv.semitones === question.interval.semitones;
          const bg = isWrong ? "var(--brick)" : isRight ? "var(--moss)" : "var(--paper-2)";
          const fg = isWrong || isRight ? "var(--on-color)" : "var(--ink)";
          return (
            <button key={iv.semitones} type="button" className="btn"
              onClick={() => answer(iv.semitones)} disabled={!isAsking}
              style={{
                justifyContent: "space-between", padding: "0.8rem 1.1rem",
                background: bg, color: fg, fontSize: "0.95rem",
              }}>
              {iv.name}
              <span className="mono" style={{ fontSize: 11, opacity: 0.55 }}>{iv.short}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
