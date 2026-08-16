import React, { useCallback, useMemo } from "react";
import { useLesson } from "../lesson/engine.js";
import { LessonBar, ComboBanner, Card } from "../ui/kit.jsx";
import {
  NoteReadingView, makeNoteDraw, noteIsCorrect,
} from "../exercises/NoteReading.jsx";
import { RhythmView, makeRhythmDraw, rhythmIsCorrect } from "../exercises/RhythmReading.jsx";
import { IntervalView, makeIntervalDraw, intervalIsCorrect } from "../exercises/IntervalEar.jsx";
import { RANGES } from "../music/notes.js";
import {
  NotePlacingView, makePlacingDraw, placingIsCorrect,
} from "../exercises/NotePlacing.jsx";
import {
  FingerboardView, makeFingeringDraw, fingeringIsCorrect,
} from "../exercises/Fingering.jsx";
import {
  IntonationView, makeIntonationDraw, intonationIsCorrect,
} from "../exercises/Intonation.jsx";
import {
  KeySignatureView, makeKeySigDraw, keySigIsCorrect,
} from "../exercises/KeySignatures.jsx";
import { MeasureView, makeMeasureDraw, measureIsCorrect } from "../exercises/Measure.jsx";
import { RhythmTapView, makeTapDraw, tapIsCorrect } from "../exercises/RhythmTap.jsx";
import {
  SingIntervalView, makeSingDraw, singIsCorrect,
} from "../exercises/SingInterval.jsx";

/* ============================================================
   DÉROULÉ D'UNE LEÇON

   Le même écran sert aux deux modes. La configuration décide de tout :
   quel exercice, quel format de partie, quel sac de questions.
   ============================================================ */

export const EXERCISES = {
  notes: {
    id: "notes",
    title: "Lecture de notes",
    short: "Notes",
    hint: "Identifier une note sur la portée",
    tone: "var(--blue)",
    needsSound: false,
  },
  rythme: {
    id: "rythme",
    title: "Lecture rythmique",
    short: "Rythme",
    hint: "Reconnaître la durée d'une note",
    tone: "var(--moss)",
    needsSound: true,
  },
  intervalles: {
    id: "intervalles",
    title: "Intervalles",
    short: "Intervalles",
    hint: "Reconnaître un intervalle à l'oreille",
    tone: "var(--mustard)",
    needsSound: true,
  },
  ecrire: {
    id: "ecrire",
    title: "Écrire la note",
    short: "Écrire",
    hint: "Poser sur la portée la note demandée",
    tone: "var(--brick)",
    needsSound: false,
  },
  ecouter: {
    id: "ecouter",
    title: "Écouter et placer",
    short: "Écouter",
    hint: "Poser sur la portée la note entendue",
    tone: "var(--blue)",
    needsSound: true,
  },
  mesure: {
    id: "mesure",
    title: "Lire une mesure",
    short: "Mesure",
    hint: "Quatre notes à la suite, dans l'ordre",
    tone: "var(--blue)",
    needsSound: false,
  },
  dictee: {
    id: "dictee",
    title: "Dictée de rythme",
    short: "Dictée",
    hint: "Taper le rythme entendu",
    tone: "var(--moss)",
    needsSound: true,
  },
  armures: {
    id: "armures",
    title: "Armures et tonalités",
    short: "Armures",
    hint: "Nommer la tonalité d'après l'armure",
    tone: "var(--mustard)",
    needsSound: false,
  },
  chanter: {
    id: "chanter",
    title: "Chanter l'intervalle",
    short: "Chanter",
    hint: "Produire l'intervalle demandé — le micro écoute",
    tone: "var(--brick)",
    needsSound: true,
    needsMic: true,
  },
  justesse: {
    id: "justesse",
    title: "La justesse",
    short: "Justesse",
    hint: "Jouer la note au violon — le micro écoute",
    tone: "var(--brick)",
    needsSound: false,
    needsMic: true,
  },
  doigte: {
    id: "doigte",
    title: "Le doigté",
    short: "Doigté",
    hint: "Trouver la corde et le doigt sur le manche",
    tone: "var(--moss)",
    needsSound: false,
    fixedDifficulty: true, // la première position, un point c'est tout
  },
};

export default function Lesson({ config, progress, audio, onFinish }) {
  const { exercise, format, difficulty, mode, notation, pool } = config;
  const soundOn = progress.settings.sound;
  const heartsOn = progress.settings.hearts && format === "serie";

  const draw = useMemo(() => {
    if (exercise === "rythme") return makeRhythmDraw(difficulty, progress.items);
    if (exercise === "intervalles") return makeIntervalDraw(difficulty, progress.items);
    if (exercise === "doigte") return makeFingeringDraw(progress.items);
    if (exercise === "justesse") return makeIntonationDraw(difficulty, progress.items, pool);
    if (exercise === "armures") return makeKeySigDraw(difficulty, progress.items);
    if (exercise === "mesure") return makeMeasureDraw(difficulty, progress.items, pool);
    if (exercise === "dictee") return makeTapDraw(difficulty);
    if (exercise === "chanter") return makeSingDraw(difficulty, progress.items);
    if (exercise === "ecrire") return makePlacingDraw(difficulty, progress.items, pool, "ecrire");
    if (exercise === "ecouter") return makePlacingDraw(difficulty, progress.items, pool, "ecouter");
    return makeNoteDraw(difficulty, progress.items, pool, {
      alterations: !!config.alterations,
      clef: config.clef || "sol",
    });
    // le sac est figé au démarrage : la mémoire évoluant à chaque réponse,
    // le recalculer changerait les poids en cours de leçon
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCorrect = useCallback((q, v) => {
    if (exercise === "rythme") return rhythmIsCorrect(q, v);
    if (exercise === "intervalles") return intervalIsCorrect(q, v);
    if (exercise === "doigte") return fingeringIsCorrect(q, v);
    if (exercise === "justesse") return intonationIsCorrect(q, v);
    if (exercise === "armures") return keySigIsCorrect(q, v);
    if (exercise === "mesure") return measureIsCorrect(q, v);
    if (exercise === "dictee") return tapIsCorrect(q, v);
    if (exercise === "chanter") return singIsCorrect(q, v);
    if (exercise === "ecrire" || exercise === "ecouter") return placingIsCorrect(q, v);
    return noteIsCorrect(q, v, notation);
  }, [exercise, notation]);

  const timer = useMemo(() => {
    // on ne met pas un violoniste au chronomètre pendant qu'il cherche sa
    // justesse : l'exercice a son propre garde-fou
    if (["justesse", "chanter", "dictee", "mesure"].includes(exercise)) return { mode: "libre" };
    if (format === "mort_subite") return { mode: "adaptatif", start: 7, min: 1.6, max: 7, step: 0.22 };
    if (!["notes", "ecrire", "ecouter"].includes(exercise)) return { mode: "libre" };
    if (config.timerMode === "adaptatif") return { mode: "adaptatif", start: 6, min: 2, max: 9, step: 0.25 };
    if (config.timerMode === "fixe") return { mode: "fixe", start: config.fixedSeconds || 6 };
    return { mode: "libre" };
  }, [format, exercise, config.timerMode, config.fixedSeconds]);

  const playNote = useCallback((midi) => {
    audio.stopAll();
    audio.playViolin(midi, 1.1, 0.42);
  }, [audio]);

  const lesson = useLesson({
    format,
    total: config.total ?? 10,
    seconds: config.seconds ?? 60,
    hearts: heartsOn,
    timer,
    draw,
    isCorrect,
    onFinish,
  });

  const meta = EXERCISES[exercise];

  // indicateur de droite : le temps restant, ou le score en cours
  const right =
    format === "chrono" ? (
      <span className="mono" style={{
        fontSize: "1.05rem",
        color: lesson.globalLeft < 10 ? "var(--brick)" : "var(--ink)",
      }}>
        {Math.ceil(lesson.globalLeft)} s
      </span>
    ) : format === "mort_subite" ? (
      <span className="mono" style={{ fontSize: "1.05rem" }}>
        {lesson.correct} d'affilée
      </span>
    ) : null;

  return (
    <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-4 pt-4 pb-10">
      <ComboBanner combo={lesson.combo} />

      <LessonBar
        onQuit={lesson.quit}
        progress={lesson.progress}
        hearts={lesson.hearts}
        heartsOn={heartsOn}
        combo={heartsOn ? null : lesson.combo}
        right={right}
      />

      {/* jauge du chronomètre par question */}
      {lesson.limit != null && (
        <div style={{
          width: "100%", height: 5, borderRadius: 99,
          background: "var(--sunk)", overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${Math.max(0, (lesson.left / lesson.limit) * 100)}%`,
            background: lesson.left / lesson.limit < 0.3 ? "var(--brick)" : "var(--ink-3)",
            transition: "width 80ms linear",
          }} />
        </div>
      )}

      <div className="w-full flex items-baseline justify-between">
        <span className="label">{meta.title}</span>
        {lesson.retryCount > 0 && (
          <span className="label" style={{ color: "var(--brick)" }}>
            {lesson.retryCount} à revoir
          </span>
        )}
      </div>

      {/* La clé sur l'index fait rejouer l'animation d'entrée : la question
          sortante laisse la place à une question qui arrive par la droite,
          au lieu d'un remplacement sec. */}
      <div key={lesson.index} className="anim-slide w-full flex flex-col items-center gap-4">
        {exercise === "notes" && (
          <NoteReadingView lesson={lesson} notation={notation}
            playNote={playNote} soundOn={soundOn} />
        )}
        {exercise === "rythme" && (
          <RhythmView lesson={lesson} audio={audio} soundOn={soundOn} />
        )}
        {exercise === "intervalles" && (
          <IntervalView lesson={lesson} audio={audio} soundOn={soundOn} />
        )}
        {(exercise === "ecrire" || exercise === "ecouter") && (
          <NotePlacingView lesson={lesson} notation={notation} audio={audio}
            soundOn={soundOn} pool={pool || RANGES[difficulty].notes} />
        )}
        {exercise === "doigte" && (
          <FingerboardView lesson={lesson} audio={audio} soundOn={soundOn} />
        )}
        {exercise === "justesse" && (
          <IntonationView lesson={lesson} audio={audio} soundOn={soundOn} />
        )}
        {exercise === "armures" && <KeySignatureView lesson={lesson} />}
        {exercise === "mesure" && (
          <MeasureView lesson={lesson} notation={notation} audio={audio} soundOn={soundOn} />
        )}
        {exercise === "dictee" && (
          <RhythmTapView lesson={lesson} audio={audio} soundOn={soundOn} />
        )}
        {exercise === "chanter" && (
          <SingIntervalView lesson={lesson} audio={audio} soundOn={soundOn} />
        )}
      </div>

      {/* Annonce la correction aux lecteurs d'écran. Sans cela, l'exercice
          se joue en silence total pour qui ne voit pas la portée. */}
      <p aria-live="polite" className="sr-only" style={{
        position: "absolute", width: 1, height: 1, overflow: "hidden",
        clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
      }}>
        {lesson.phase === "feedback"
          ? (lesson.wasCorrect ? "Bonne réponse" : "Raté")
          : ""}
      </p>

      {mode === "progression" && config.lessonTitle && (
        <Card flat className="p-2 px-3">
          <span className="label">{config.lessonTitle}</span>
        </Card>
      )}
    </div>
  );
}
