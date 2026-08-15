import React, { useCallback, useMemo } from "react";
import { useLesson } from "../lesson/engine.js";
import { LessonBar, ComboBanner, Card } from "../ui/kit.jsx";
import {
  NoteReadingView, makeNoteDraw, noteIsCorrect,
} from "../exercises/NoteReading.jsx";
import { RhythmView, makeRhythmDraw, rhythmIsCorrect } from "../exercises/RhythmReading.jsx";
import { IntervalView, makeIntervalDraw, intervalIsCorrect } from "../exercises/IntervalEar.jsx";

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
};

export default function Lesson({ config, progress, audio, onFinish }) {
  const { exercise, format, difficulty, mode, notation, pool } = config;
  const soundOn = progress.settings.sound;
  const heartsOn = progress.settings.hearts && format === "serie";

  const draw = useMemo(() => {
    if (exercise === "rythme") return makeRhythmDraw(difficulty, progress.items);
    if (exercise === "intervalles") return makeIntervalDraw(difficulty, progress.items);
    return makeNoteDraw(difficulty, progress.items, pool);
    // le sac est figé au démarrage : la mémoire évoluant à chaque réponse,
    // le recalculer changerait les poids en cours de leçon
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isCorrect = useCallback((q, v) => {
    if (exercise === "rythme") return rhythmIsCorrect(q, v);
    if (exercise === "intervalles") return intervalIsCorrect(q, v);
    return noteIsCorrect(q, v, notation);
  }, [exercise, notation]);

  const timer = useMemo(() => {
    if (format === "mort_subite") return { mode: "adaptatif", start: 7, min: 1.6, max: 7, step: 0.22 };
    if (exercise !== "notes") return { mode: "libre" };
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

      {mode === "progression" && config.lessonTitle && (
        <Card flat className="p-2 px-3">
          <span className="label">{config.lessonTitle}</span>
        </Card>
      )}
    </div>
  );
}
