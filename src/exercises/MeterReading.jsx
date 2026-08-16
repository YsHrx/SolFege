import React, { useCallback, useEffect, useRef, useState } from "react";
import { RhythmStaff } from "../ui/Glyphs.jsx";
import { Btn, Card } from "../ui/kit.jsx";
import {
  METER_POOL, RHYTHM_POOL, buildPattern, meterBeats, meterFor,
  patternKey, sameSound,
} from "../music/rhythm.js";
import { shuffle } from "../state/srs.js";

/* ============================================================
   RECONNAÎTRE LA MESURE

   On entend une mesure entière — plusieurs valeurs, des silences, un
   chiffrage — et on choisit celle qui est écrite. C'est le pas d'après
   la lecture rythmique valeur par valeur : dans une partition, une
   durée n'arrive jamais seule, elle occupe une place dans une mesure.

   Les leurres sont de vraies mesures du même chiffrage, jamais des
   motifs qui sonneraient identiquement : deux propositions qu'on ne
   peut pas départager à l'oreille ne testent rien.
   ============================================================ */

const TEST_MIDI = 69; // La4, corde à vide : hauteur neutre

export const meterKeyOf = (q) => `mesure_rythme:${q.meter.id}:${patternKey(q.pattern)}`;

export function makeMeterDraw(difficulty) {
  const values = RHYTHM_POOL[difficulty];
  const meters = METER_POOL[difficulty];
  return () => {
    const meter = meterFor(meters[Math.floor(Math.random() * meters.length)]);
    const pattern = buildPattern(meter, values, { rests: difficulty !== "debutant" });

    // trois leurres qui sonnent différemment
    const decoys = [];
    let guard = 0;
    while (decoys.length < 3 && guard < 80) {
      guard += 1;
      const d = buildPattern(meter, values, { rests: difficulty !== "debutant" });
      if (sameSound(d, pattern)) continue;
      if (decoys.some((x) => sameSound(x, d))) continue;
      decoys.push(d);
    }

    const choices = shuffle([pattern, ...decoys]);
    return {
      key: `mesure_rythme:${meter.id}:${patternKey(pattern)}`,
      meter, pattern, choices,
    };
  };
}

export const meterIsCorrect = (q, v) => v === patternKey(q.pattern);

export function MeterReadingView({ lesson, audio, soundOn, bpm }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const { meter, pattern, choices } = question;

  const [playing, setPlaying] = useState(false);
  const [pulse, setPulse] = useState(-1);
  const tokenRef = useRef(0);
  const rafRef = useRef(0);
  const liveRef = useRef(question);
  liveRef.current = question;

  const beatMs = 60000 / (bpm || 97);

  const stop = useCallback(() => {
    tokenRef.current += 1;
    cancelAnimationFrame(rafRef.current);
    setPlaying(false);
    setPulse(-1);
  }, []);

  const play = useCallback(() => {
    if (playing) return;
    const token = ++tokenRef.current;
    setPlaying(true);
    const q = liveRef.current;
    const beatS = beatMs / 1000;
    const m = q.meter;
    const total = meterBeats(m);

    // une mesure de décompte sur la pulsation, puis le motif
    for (let p = 0; p < m.pulses * 2; p++) {
      audio.playTick(p % m.pulses === 0, p * m.pulseBeats * beatS);
    }
    let at = total; // le motif démarre après le décompte
    for (const s of q.pattern) {
      if (!s.rest) {
        const when = at * beatS;
        setTimeout(() => {
          if (tokenRef.current !== token) return;
          audio.playViolin(TEST_MIDI, Math.min(s.value.beats * beatS, 2.4), 0.45);
        }, when * 1000);
      }
      at += s.value.beats;
    }

    const t0 = audio.audioNow();
    const dur = total * 2 * beatS;
    const loop = () => {
      if (tokenRef.current !== token) return;
      const e = audio.audioNow() - t0;
      if (e >= dur) { stop(); return; }
      setPulse(Math.floor(e / (m.pulseBeats * beatS)) % m.pulses);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [audio, playing, stop, beatMs]);

  const stamp = `${lesson.index}:${question.key}`;
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

  const answer = (key) => {
    stop();
    audio.stopAll();
    if (soundOn) audio.playFeedback(key === patternKey(pattern));
    submit(key);
  };

  const shake = phase === "feedback" && !wasCorrect;
  const right = patternKey(pattern);

  return (
    <>
      <Card sunk className={`w-full py-5 flex flex-col items-center gap-4 ${shake ? "anim-shake" : ""}`}>
        <div className="flex items-center gap-3">
          <span className="chip mono" style={{ color: "var(--ink-3)" }}>{meter.label}</span>
          <div className="flex gap-2" aria-hidden>
            {Array.from({ length: meter.pulses }).map((_, p) => (
              <span key={p} style={{
                width: 13, height: 13, borderRadius: "50%",
                border: "2.5px solid var(--edge)",
                background: pulse === p ? "var(--mustard)" : "var(--paper)",
                transform: pulse === p ? "scale(1.25)" : "scale(1)",
                transition: "background 70ms, transform 90ms",
              }} />
            ))}
          </div>
        </div>
        <Btn size="sm" onClick={play} disabled={playing || !isAsking}>
          {playing ? "Écoute…" : "▶ Réécouter"}
        </Btn>
      </Card>

      <p className="label text-center">Laquelle avez-vous entendue ?</p>

      <div className="flex flex-col gap-2 w-full">
        {choices.map((c) => {
          const key = patternKey(c);
          const isWrong = phase === "feedback" && !wasCorrect && answered === key;
          const isRight = phase === "feedback" && key === right;
          const border = isWrong ? "var(--brick)" : isRight ? "var(--moss)" : "var(--edge)";
          const bg = isWrong ? "#00000012" : isRight ? "#00000012" : "var(--paper-2)";
          return (
            <button key={key} type="button" onClick={() => answer(key)} disabled={!isAsking}
              style={{
                background: bg, border: `2.5px solid ${border}`, borderRadius: 14,
                boxShadow: `0 4px 0 ${border}`, padding: "0.5rem 0.4rem",
                transition: "border-color 140ms, box-shadow 140ms",
              }}>
              <RhythmStaff pattern={c} meter={meter} spacing={13}
                state={isWrong ? "bad" : isRight ? "good" : null}
                ariaLabel={`Motif de ${c.length} valeurs`} />
            </button>
          );
        })}
      </div>
    </>
  );
}
