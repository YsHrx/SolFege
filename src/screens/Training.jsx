import React, { useState } from "react";
import { Btn, Card, Segmented } from "../ui/kit.jsx";
import { NoteFigure } from "../ui/Glyphs.jsx";
import { EXERCISES } from "./Lesson.jsx";
import { FORMATS } from "../lesson/engine.js";
import { DIFFICULTIES, RANGES } from "../music/notes.js";
import { RHYTHM_POOL } from "../music/rhythm.js";
import { INTERVAL_POOL } from "../music/intervals.js";
import { accuracyByExercise, recordKey } from "../state/progress.js";

/* ============================================================
   MODE ENTRAÎNEMENT

   L'inverse du chemin : on choisit tout. Pour travailler un point
   précis, ou pour battre un record.
   ============================================================ */

const CHRONO_SECONDS = [60, 90, 120];

function ExerciseIcon({ id }) {
  if (id === "rythme") return <NoteFigure value="croche" size={30} />;
  if (id === "doigte") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
        <rect x="7" y="2.5" width="10" height="19" rx="3" fill="none"
          stroke="currentColor" strokeWidth="2.2" />
        <path d="M10 3v18M14 3v18" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="10" cy="10" r="2.6" fill="currentColor" />
      </svg>
    );
  }
  if (id === "ecrire" || id === "ecouter") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
        <path d="M2 7h20M2 12h20M2 17h20" stroke="currentColor" strokeWidth="1.6" />
        <ellipse cx="15" cy="14.5" rx="4.2" ry="3.1" transform="rotate(-18 15 14.5)"
          fill="currentColor" />
      </svg>
    );
  }
  if (id === "intervalles") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden>
        <path d="M4 15c3 0 3-6 6-6s3 6 6 6 4-3 4-3"
          fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }
  return <NoteFigure value="noire" size={30} />;
}

export function TrainingHome({ progress, onPick }) {
  const stats = accuracyByExercise(progress);

  return (
    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto px-4 pb-16">
      <p className="text-sm" style={{ color: "var(--ink-2)" }}>
        Des exercices à la carte, sans parcours. Trois formats de partie,
        et un record à battre pour chacun.
      </p>

      {Object.values(EXERCISES).map((ex) => {
        const s = stats[ex.id];
        const best = Math.max(
          ...DIFFICULTIES.flatMap((d) => [
            progress.records[recordKey(ex.id, "chrono", d)] || 0,
            progress.records[recordKey(ex.id, "mort_subite", d)] || 0,
          ]),
          0
        );
        return (
          <button key={ex.id} type="button" onClick={() => onPick(ex.id)}
            className="btn" style={{
              justifyContent: "flex-start", gap: "0.9rem", textAlign: "left",
              padding: "1rem 1.1rem", borderRadius: 16,
            }}>
            <span style={{ color: ex.tone }}><ExerciseIcon id={ex.id} /></span>
            <span className="flex-1 min-w-0">
              <span className="block display" style={{ fontSize: "1.05rem" }}>{ex.title}</span>
              <span className="block" style={{
                fontSize: "0.78rem", fontWeight: 400, color: "var(--ink-3)",
                fontFamily: "Plex, sans-serif",
              }}>
                {ex.hint}
              </span>
            </span>
            <span className="text-right">
              {s && s.total > 0 && (
                <span className="block mono" style={{ fontSize: "0.9rem", color: ex.tone }}>
                  {Math.round((s.correct / s.total) * 100)}%
                </span>
              )}
              {best > 0 && (
                <span className="block mono" style={{ fontSize: "0.68rem", color: "var(--ink-3)" }}>
                  record {best}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TrainingSetup({ exercise, progress, onStart, onBack }) {
  const ex = EXERCISES[exercise];
  const [difficulty, setDifficulty] = useState(progress.settings.lastDifficulty || "debutant");
  const [format, setFormat] = useState("serie");
  const [seconds, setSeconds] = useState(60);
  const [timerMode, setTimerMode] = useState("libre");
  const [fixedSeconds, setFixedSeconds] = useState(6);

  const showTimer = ["notes", "ecrire", "ecouter"].includes(exercise) && format === "serie";
  const showDifficulty = !ex.fixedDifficulty;
  const record = progress.records[recordKey(exercise, format, difficulty)];

  const poolHint =
    exercise === "rythme" ? RHYTHM_POOL[difficulty].map((r) => r.label).join(", ")
      : exercise === "intervalles" ? `${INTERVAL_POOL[difficulty].length} intervalles testés`
        : RANGES[difficulty].hint;

  const start = () => onStart({
    exercise, difficulty, format,
    seconds: format === "chrono" ? seconds : undefined,
    total: format === "serie" ? (exercise === "notes" ? 12 : 10) : undefined,
    timerMode: showTimer ? timerMode : "libre",
    fixedSeconds,
  });

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto px-4 pb-16">
      <button type="button" onClick={onBack} className="self-start text-sm"
        style={{ color: "var(--blue)", background: "none", border: "none", padding: 0 }}>
        ← Tous les exercices
      </button>

      <h2 style={{ fontSize: "1.7rem" }}>{ex.title}</h2>

      <div className="flex flex-col gap-2">
        <span className="label">Format de partie</span>
        <div className="flex flex-col gap-2">
          {Object.values(FORMATS)
            .filter((f) => !(ex.needsMic && f.id === "chrono"))
            .map((f) => (
            <button key={f.id} type="button" onClick={() => setFormat(f.id)}
              className="btn" aria-pressed={format === f.id}
              style={{
                justifyContent: "flex-start", textAlign: "left", padding: "0.7rem 1rem",
                background: format === f.id ? "var(--blue)" : "var(--paper-2)",
                color: format === f.id ? "var(--on-color)" : "var(--ink)",
              }}>
              <span className="flex-1">
                <span className="block">{f.label}</span>
                <span className="block" style={{
                  fontSize: "0.74rem", fontWeight: 400, fontFamily: "Plex, sans-serif",
                  opacity: 0.75,
                }}>
                  {f.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {format === "chrono" && (
        <div className="flex flex-col gap-2">
          <span className="label">Durée</span>
          <Segmented value={seconds} onChange={setSeconds} ariaLabel="Durée"
            options={CHRONO_SECONDS.map((s) => ({ value: s, label: `${s} s` }))} />
        </div>
      )}

      {showDifficulty ? (
        <div className="flex flex-col gap-2">
          <span className="label">
            Difficulté — {exercise === "rythme" || exercise === "intervalles"
              ? "quelles valeurs sont testées" : "quelles notes apparaissent"}
          </span>
          <Segmented value={difficulty} onChange={setDifficulty} ariaLabel="Difficulté"
            options={DIFFICULTIES.map((d) => ({ value: d, label: RANGES[d].label }))} />
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>{poolHint}</p>
        </div>
      ) : (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Toute la première position — c'est le cadre de l'exercice, il n'y a
          pas de difficulté à régler.
        </p>
      )}

      {showTimer && (
        <div className="flex flex-col gap-2">
          <span className="label">Temps par note</span>
          <Segmented value={timerMode} onChange={setTimerMode} ariaLabel="Temps par note"
            options={[
              { value: "libre", label: "Libre" },
              { value: "adaptatif", label: "Adaptatif" },
              { value: "fixe", label: "Fixe" },
            ]} />
          {timerMode === "fixe" && (
            <div className="flex items-center gap-3">
              <input type="range" min="2" max="15" value={fixedSeconds}
                onChange={(e) => setFixedSeconds(Number(e.target.value))}
                className="flex-1" aria-label="Secondes par note" />
              <span className="mono text-sm w-12 text-right">{fixedSeconds} s</span>
            </div>
          )}
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            {timerMode === "libre" && "Aucune limite : la note suivante arrive dès que vous répondez."}
            {timerMode === "adaptatif" && "Le temps se resserre à chaque réussite, s'élargit à chaque erreur."}
            {timerMode === "fixe" && "Le même temps à chaque note."}
          </p>
        </div>
      )}

      {ex.needsSound && !progress.settings.sound && (
        <Card flat className="p-3">
          <p className="text-xs" style={{ color: "var(--ink-2)" }}>
            Le son est coupé et cet exercice s'écoute. Réactivez-le dans les
            réglages, ou servez-vous du bouton « Réécouter » à chaque question.
          </p>
        </Card>
      )}

      {record > 0 && (
        <Card className="p-3 flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>Record à battre</span>
          <span className="display" style={{ fontSize: "1.3rem", color: "var(--mustard)" }}>
            {record}
          </span>
        </Card>
      )}

      <Btn block tone="moss" onClick={start} style={{ padding: "0.95rem" }}>
        Commencer
      </Btn>
    </div>
  );
}
