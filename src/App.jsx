import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAudio } from "./audio/useAudio.js";
import {
  applyLesson, dayKey, lessonsToday, loadProgress, recordKey,
  NOTE_PREFIXES, resetProgress, saveProgress, streakAlive, weakItems, xpFor,
  xpForLevel,
} from "./state/progress.js";
import { applyUpdateIfIdle } from "./state/update.js";
import { ALL_LESSONS, nextLesson, unitLegendary } from "./lesson/curriculum.js";
import { Btn, Card, Segmented, StaffLines } from "./ui/kit.jsx";
import { Mascot } from "./ui/Mascot.jsx";
import Lesson, { EXERCISES } from "./screens/Lesson.jsx";
import Results from "./screens/Results.jsx";
import Path from "./screens/Path.jsx";
import { TrainingHome, TrainingSetup } from "./screens/Training.jsx";
import Settings from "./screens/Settings.jsx";
import { noteByLabel } from "./music/notes.js";

/* ============================================================
   SOLFÈGE

   Deux modes derrière un sélecteur :

   — Progression : un chemin d'unités qui se débloquent, la série en
     jours, la répétition espacée. On ne choisit rien, on suit.
   — Entraînement : les exercices à la carte, avec trois formats de
     partie et des records. Pour travailler un point précis.

   Les deux alimentent la même progression — XP, niveau, mémoire par
   note — mais seul le mode Progression fait avancer le chemin.
   ============================================================ */

/* ---------- thème ---------- */
function useTheme(setting) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        setting === "systeme" ? (media.matches ? "ardoise" : "papier") : setting;
      document.documentElement.setAttribute("data-theme", resolved);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", resolved === "ardoise" ? "#1a211d" : "#fbf7ea");
    };
    apply();
    // le réglage « système » doit suivre les changements en direct
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [setting]);
}

/* ---------- en-tête commun ---------- */
function Header({ progress, mode, onMode, onSettings }) {
  const level = progress.level;
  const need = xpForLevel(level);
  const pct = Math.min(100, Math.round((progress.xp / need) * 100));
  const today = lessonsToday(progress);
  const goal = progress.settings.goal;
  const alive = streakAlive(progress);
  const streak = alive ? progress.days.streak : 0;

  return (
    <header className="w-full max-w-lg mx-auto px-4 pt-5 pb-3 flex flex-col gap-3">
      {/* les lignes de portée n'habillent que la ligne de titre : plus bas
          elles passeraient derrière les cartes et brouilleraient la lecture */}
      <div className="flex items-center gap-3 relative" style={{ minHeight: 46 }}>
        <StaffLines top={4} height={38} />
        <h1 className="relative" style={{ fontSize: "1.9rem", letterSpacing: "-0.01em" }}>
          Sol<span style={{ color: "var(--blue)" }}>Fège</span>
        </h1>
        <div className="flex-1" />
        <button type="button" onClick={onSettings} aria-label="Réglages"
          className="relative"
          style={{ background: "none", border: "none", padding: 6, color: "var(--ink-2)" }}>
          <svg width="23" height="23" viewBox="0 0 24 24" aria-hidden fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3" />
          </svg>
        </button>
      </div>

      <div className="flex gap-2">
        {/* la série, en JOURS */}
        <Card className="flex-1 p-2.5 flex items-center gap-2">
          <span className="display" style={{
            fontSize: "1.35rem", color: streak > 0 ? "var(--mustard)" : "var(--ink-3)",
          }}>
            {streak}
          </span>
          <span className="text-xs leading-tight" style={{ color: "var(--ink-3)" }}>
            jour{streak > 1 ? "s" : ""}<br />d'affilée
          </span>
          {progress.days.freezes > 0 && (
            <span className="chip" style={{ color: "var(--blue)", marginLeft: "auto" }}>
              {progress.days.freezes} gel{progress.days.freezes > 1 ? "s" : ""}
            </span>
          )}
        </Card>

        {/* l'objectif du jour */}
        <Card className="p-2.5 flex items-center gap-2" style={{ minWidth: 108 }}>
          <Ring value={Math.min(1, today / goal)} />
          <span className="text-xs leading-tight" style={{ color: "var(--ink-3)" }}>
            <span className="mono" style={{ color: "var(--ink)" }}>{today}/{goal}</span><br />aujourd'hui
          </span>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <span className="chip mono" style={{ color: "var(--ink-3)" }}>niv. {level}</span>
        <div className="gauge flex-1" style={{ height: 12 }}>
          <i style={{ width: `${Math.max(3, pct)}%` }} />
        </div>
        <span className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-3)" }}>
          {progress.xp}/{need}
        </span>
      </div>

      <Segmented value={mode} onChange={onMode} ariaLabel="Mode"
        options={[
          { value: "progression", label: "Progression" },
          { value: "entrainement", label: "Entraînement" },
        ]} />
    </header>
  );
}

/** Anneau d'objectif quotidien. */
function Ring({ value, size = 34 }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} aria-hidden style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--sunk)" strokeWidth="5" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={value >= 1 ? "var(--moss)" : "var(--mustard)"} strokeWidth="5"
        strokeLinecap="round" strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        style={{ transition: "stroke-dashoffset 500ms cubic-bezier(.34,1.56,.64,1)" }} />
    </svg>
  );
}

/* ---------- état des échantillons ---------- */
function SoundStatus({ ready, progressPct, failed }) {
  if (failed) {
    return (
      <Card flat className="p-2.5 flex items-center gap-2 mx-4">
        <span className="chip" style={{ color: "var(--brick)" }}>synthèse</span>
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>
          Réseau indisponible — le violon est synthétisé
        </span>
      </Card>
    );
  }
  if (ready && progressPct >= 100) return null;
  return (
    <Card flat className="p-2.5 flex items-center gap-2 mx-4">
      <span className="text-xs flex-1" style={{ color: "var(--ink-3)" }}>
        {ready ? "Violon enregistré — chargement du registre aigu" : "Chargement du violon"}
      </span>
      <span className="mono" style={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>
        {progressPct}%
      </span>
    </Card>
  );
}

/* ============================================================ */

export default function App() {
  const [progress, setProgress] = useState(loadProgress);
  const [mode, setMode] = useState("progression");
  const [screen, setScreen] = useState("home");

  /* Une nouvelle version en attente se prend sur l'accueil, où le
     rechargement ne coûte rien — pas au milieu d'une leçon. */
  useEffect(() => {
    if (screen === "home") applyUpdateIfIdle();
  }, [screen]);
  const [setupExercise, setSetupExercise] = useState(null);
  const [config, setConfig] = useState(null);
  const [result, setResult] = useState(null);
  const [runKey, setRunKey] = useState(0);

  const audio = useAudio();
  useTheme(progress.settings.theme);

  useEffect(() => { audio.preload(); }, [audio.preload]);
  // le diapason vaut pour ce qu'on entend comme pour ce qu'on mesure
  useEffect(() => {
    audio.setTuning(progress.settings.a4);
  }, [audio.setTuning, progress.settings.a4]);
  useEffect(() => { saveProgress(progress); }, [progress]);

  const startLesson = useCallback((cfg) => {
    audio.unlock();
    setConfig({ ...cfg, notation: progress.settings.notation });
    setRunKey((k) => k + 1);
    setScreen("lesson");
  }, [audio, progress.settings.notation]);

  /* ---------- mode Progression ---------- */
  const startPathLesson = useCallback((lesson) => {
    startLesson({
      mode: "progression",
      exercise: lesson.exercise,
      difficulty: lesson.difficulty || "intermediaire",
      pool: lesson.pool,
      total: lesson.total,
      format: "serie",
      timerMode: lesson.timerMode || "libre",
      alterations: !!lesson.alterations,
      clef: lesson.clef || "sol",
      position: lesson.position || 1,
      lessonId: lesson.id,
      lessonTitle: `${lesson.unitTitle ?? ""} · ${lesson.title}`.replace(/^ · /, ""),
    });
  }, [startLesson]);

  /* L'épreuve légendaire : le sac réuni de l'unité, au chronomètre
     adaptatif, et une seule erreur suffit à la manquer — c'est le format
     Mort subite avec un objectif de longueur. */
  const startLegendary = useCallback((unitId) => {
    const l = unitLegendary(unitId);
    if (!l) return;
    startLesson({
      mode: "progression",
      exercise: l.exercise,
      difficulty: l.difficulty,
      pool: l.pool || undefined,
      total: l.total,
      format: "serie",
      timerMode: ["notes", "ecrire", "ecouter"].includes(l.exercise) ? "adaptatif" : "libre",
      legendaryLessons: l.lessonIds,
      lessonTitle: `Épreuve légendaire · ${l.title}`,
    });
  }, [startLesson]);

  const practiseWeak = useCallback(() => {
    const weak = weakItems(progress, NOTE_PREFIXES, 8)
      .map((w) => noteByLabel(w.label))
      .filter(Boolean);
    if (weak.length < 2) return;
    startLesson({
      mode: "entrainement",
      exercise: "notes",
      difficulty: "intermediaire",
      pool: weak,
      total: Math.max(8, weak.length),
      format: "serie",
      timerMode: "libre",
      lessonTitle: "Points faibles",
    });
  }, [progress, startLesson]);

  /* ---------- fin de leçon ---------- */
  const handleFinish = useCallback((raw) => {
    const cfg = config;
    const xpGained = xpFor(raw);
    const key = cfg.format === "serie"
      ? null
      : recordKey(cfg.exercise, cfg.format, cfg.difficulty);
    const previousRecord = key ? progress.records[key] || 0 : 0;

    const payload = {
      ...raw,
      exercise: cfg.exercise,
      format: cfg.format,
      difficulty: cfg.difficulty,
      mode: cfg.mode,
      lessonId: cfg.lessonId,
      legendaryLessons: cfg.legendaryLessons,
      recordKey: key,
    };

    const before = progress;
    const after = applyLesson(before, payload);
    setProgress(after);

    const misses = [...new Set(
      (raw.itemResults || []).filter((r) => !r.ok).map((r) => r.key)
    )];

    const goldWon =
      !!cfg.legendaryLessons && !raw.abandoned && !raw.failed
      && raw.total > 0 && raw.correct === raw.total;

    setResult({
      ...payload,
      xpGained,
      goldWon,
      misses,
      newRecord: !!key && typeof raw.score === "number" && raw.score > previousRecord && raw.score > 0,
      streak: after.days.streak,
      streakBumped: after.days.streak !== before.days.streak,
    });
    setScreen("results");
  }, [config, progress]);

  const next = useMemo(() => nextLesson(progress.path.done), [progress.path.done]);

  const goHome = () => { setScreen("home"); setSetupExercise(null); };

  /* ---------- rendu ---------- */
  if (screen === "lesson") {
    return (
      <Lesson key={runKey} config={config} progress={progress}
        audio={audio} onFinish={handleFinish} />
    );
  }

  if (screen === "results") {
    // « Continuer » ne mène à la suite que si la leçon est réellement
    // validée ; sinon le bouton principal est « Recommencer ».
    const continueToNext =
      result.mode === "progression" && !result.abandoned && !result.failed
        ? () => startPathLesson(next)
        : null;
    return (
      <Results result={result} onHome={goHome}
        onRetry={() => { setRunKey((k) => k + 1); setScreen("lesson"); }}
        onNext={continueToNext} />
    );
  }

  if (screen === "settings") {
    return (
      <div className="min-h-screen pt-6">
        <Settings progress={progress} onBack={goHome}
          onChange={(settings) => setProgress((p) => ({ ...p, settings }))}
          onImport={(next) => { setProgress(next); goHome(); }}
          onReset={() => { setProgress(resetProgress()); goHome(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header progress={progress} mode={mode} onMode={setMode}
        onSettings={() => setScreen("settings")} />

      <div className="mt-2 flex flex-col gap-3">
        <SoundStatus ready={audio.samplesReady} progressPct={audio.sampleProgress}
          failed={audio.samplesFailed} />

        {mode === "progression" && (
          <Path progress={progress} onStart={startPathLesson}
            onPractiseWeak={practiseWeak} onLegendary={startLegendary} />
        )}

        {mode === "entrainement" && (
          setupExercise
            ? <TrainingSetup exercise={setupExercise} progress={progress}
                onBack={() => setSetupExercise(null)}
                onStart={(cfg) => startLesson({ ...cfg, mode: "entrainement" })} />
            : <TrainingHome progress={progress} onPick={setSetupExercise} />
        )}
      </div>
    </div>
  );
}
