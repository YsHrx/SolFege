import React, { useCallback, useEffect, useRef, useState } from "react";
import { NoteFigure } from "../ui/Glyphs.jsx";
import { Btn, Card } from "../ui/kit.jsx";
import { BEAT_MS, RHYTHM_POOL } from "../music/rhythm.js";
import { shuffle } from "../state/srs.js";

/* ============================================================
   DICTÉE DE RYTHME

   On entend une mesure, on la retape. C'est beaucoup plus musical que
   de choisir entre quatre étiquettes : reconnaître une croche dans une
   liste et la placer dans le temps sont deux compétences distinctes,
   et seule la seconde sert quand on joue.

   Tolérance : un quart de temps d'écart sur chaque attaque. À 97 à la
   noire, cela fait environ 155 ms — exigeant sans être injouable, et
   du même ordre que ce qu'un professeur laisse passer.
   ============================================================ */

const TEST_MIDI = 69;
const BEATS = 4;
const TOLERANCE = 0.25; // en temps

/** Compose une mesure de quatre temps avec les valeurs disponibles. */
function buildPattern(pool) {
  const usable = pool.filter((v) => v.beats <= BEATS);
  for (let attempt = 0; attempt < 60; attempt++) {
    const seq = [];
    let left = BEATS;
    while (left > 0.001) {
      const fits = usable.filter((v) => v.beats <= left + 0.001);
      if (!fits.length) break;
      seq.push(fits[Math.floor(Math.random() * fits.length)]);
      left -= seq[seq.length - 1].beats;
    }
    // une mesure d'une seule ronde ne se « tape » pas : il faut au moins
    // deux attaques pour qu'il y ait un rythme à restituer
    if (Math.abs(left) < 0.001 && seq.length >= 2 && seq.length <= 6) return seq;
  }
  return [pool[0], pool[0], pool[0], pool[0]].slice(0, 4);
}

export const tapKeyOf = (seq) => `dictee:${seq.map((v) => v.id).join("-")}`;

export function makeTapDraw(difficulty) {
  const pool = RHYTHM_POOL[difficulty];
  return () => {
    const seq = buildPattern(pool);
    // les attaques, en temps depuis le début de la mesure
    const onsets = [];
    let t = 0;
    for (const v of seq) { onsets.push(t); t += v.beats; }
    return { key: tapKeyOf(seq), seq, onsets };
  };
}

export const tapIsCorrect = (q, v) => v === true;

export function RhythmTapView({ lesson, audio, soundOn }) {
  const { question, phase, wasCorrect, submit, isAsking } = lesson;
  const { seq, onsets } = question;

  const [stage, setStage] = useState("ecoute"); // ecoute | pret | tape
  const [taps, setTaps] = useState([]);
  const [beat, setBeat] = useState(-1);
  const tokenRef = useRef(0);
  const rafRef = useRef(0);
  const startRef = useRef(0);
  const settled = useRef(false);
  const liveRef = useRef(question);
  liveRef.current = question;

  const stopLoop = () => { tokenRef.current += 1; cancelAnimationFrame(rafRef.current); setBeat(-1); };

  const play = useCallback(() => {
    stopLoop();
    const token = ++tokenRef.current;
    setStage("ecoute");
    const beatS = BEAT_MS / 1000;
    const q = liveRef.current;

    // une mesure de décompte, puis la mesure jouée
    for (let b = 0; b < BEATS * 2; b++) audio.playTick(b % BEATS === 0, b * beatS);
    q.seq.forEach((v, i) => {
      const at = (BEATS + q.onsets[i]) * beatS;
      setTimeout(() => {
        if (tokenRef.current !== token) return;
        audio.playViolin(TEST_MIDI, Math.min(v.beats * beatS, 1.4), 0.45);
      }, at * 1000);
    });

    const t0 = audio.audioNow();
    const total = BEATS * 2 * beatS;
    const loop = () => {
      if (tokenRef.current !== token) return;
      const e = audio.audioNow() - t0;
      if (e >= total) { setBeat(-1); setStage("pret"); return; }
      setBeat(Math.floor(e / beatS) % BEATS);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, [audio]);

  const stamp = `${lesson.index}:${question.key}`;
  const lastStamp = useRef(null);
  useEffect(() => {
    if (lastStamp.current === stamp) return;
    lastStamp.current = stamp;
    setTaps([]);
    setStage("ecoute");
    settled.current = false;
    if (!soundOn) { setStage("pret"); return undefined; }
    const t = setTimeout(play, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp, soundOn]);

  useEffect(() => () => stopLoop(), []);

  const judge = useCallback((list) => {
    const q = liveRef.current;
    if (list.length !== q.onsets.length) return false;
    // la première frappe donne l'origine : on juge le rythme, pas le
    // temps de réaction
    const t0 = list[0];
    return q.onsets.every((expected, i) => {
      const got = (list[i] - t0) / BEAT_MS;
      return Math.abs(got - expected) <= TOLERANCE;
    });
  }, []);

  const tap = useCallback(() => {
    if (!isAsking || settled.current || stage === "ecoute") return;
    const now = performance.now();
    if (stage === "pret") { setStage("tape"); startRef.current = now; }
    audio.playTick(false, 0);

    setTaps((prev) => {
      const list = [...prev, now];
      if (list.length >= liveRef.current.onsets.length) {
        settled.current = true;
        setTimeout(() => submit(judge(list)), 260);
      }
      return list;
    });
  }, [isAsking, stage, audio, submit, judge]);

  // barre d'espace : taper au clavier est plus précis qu'au doigt
  useEffect(() => {
    const h = (e) => {
      if (e.key === " " || e.key === "Spacebar") { e.preventDefault(); tap(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [tap]);

  const shake = phase === "feedback" && !wasCorrect;
  const done = taps.length;
  const total = onsets.length;

  return (
    <>
      <Card sunk className={`w-full py-5 flex flex-col items-center gap-4 ${shake ? "anim-shake" : ""}`}>
        <div className="flex gap-2" aria-hidden>
          {[0, 1, 2, 3].map((b) => (
            <span key={b} style={{
              width: 13, height: 13, borderRadius: "50%",
              border: "2.5px solid var(--edge)",
              background: beat === b ? "var(--mustard)" : "var(--paper)",
              transform: beat === b ? "scale(1.25)" : "scale(1)",
              transition: "background 70ms, transform 90ms",
            }} />
          ))}
        </div>

        {/* la mesure n'est révélée qu'à la correction : la montrer avant
            transformerait la dictée en lecture */}
        {phase === "feedback" ? (
          <div className="flex items-end gap-3">
            {seq.map((v, i) => (
              <span key={i} style={{ color: wasCorrect ? "var(--moss)" : "var(--brick)" }}>
                <NoteFigure value={v.id} size={40} />
              </span>
            ))}
          </div>
        ) : (
          <Btn size="sm" onClick={play} disabled={stage === "ecoute" || !isAsking}>
            {stage === "ecoute" ? "Écoute…" : "▶ Réécouter"}
          </Btn>
        )}
      </Card>

      <button type="button" onClick={tap}
        disabled={!isAsking || stage === "ecoute" || settled.current}
        className="btn btn-gold w-full"
        style={{ height: 128, fontSize: "1.15rem", borderRadius: 20 }}>
        {stage === "ecoute" ? "Écoutez d'abord"
          : done === 0 ? "Tapez le rythme"
            : `${done} / ${total}`}
      </button>

      <p className="label text-center">
        Une frappe par note · la barre d'espace marche aussi
      </p>
    </>
  );
}
