import React, { useEffect, useMemo, useRef } from "react";
import { Btn, Card } from "../ui/kit.jsx";
import { Mascot } from "../ui/Mascot.jsx";
import { NoteFigure } from "../ui/Glyphs.jsx";
import {
  UNITS, lessonStates, nextLesson, unitLegendary, unitProgress,
} from "../lesson/curriculum.js";
import { EXERCISES } from "./Lesson.jsx";
import { weakItems } from "../state/progress.js";

/* ============================================================
   LE CHEMIN

   Le contraire d'un menu : on ne choisit ni l'exercice, ni la
   difficulté, ni le format. La prochaine leçon est évidente, et le
   contenu s'élargit à mesure qu'on avance.
   ============================================================ */

const NODE = 60;

/* Les nœuds serpentent de part et d'autre de l'axe. Un motif explicite
   plutôt qu'une sinusoïde : on maîtrise l'amplitude, et le chemin repasse
   vraiment par la gauche — une sinusoïde mal cadrée dérive d'un seul côté. */
const WEAVE = [0, 48, 66, 34, -14, -58, -66, -30];
const offsetFor = (i) => WEAVE[i % WEAVE.length];

function NodeIcon({ lesson, state }) {
  if (state === "verrouille") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
        <rect x="5" y="10" width="14" height="11" rx="3"
          fill="none" stroke="var(--ink-3)" strokeWidth="2.6" />
        <path d="M8.5 10V7.5a3.5 3.5 0 017 0V10"
          fill="none" stroke="var(--ink-3)" strokeWidth="2.6" />
      </svg>
    );
  }
  if (lesson.checkpoint) {
    return (
      <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 16.7 6.4 19.8l1.3-6.3L3 9.2l6.3-.7z"
          fill="currentColor" stroke="var(--edge)" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }
  if (lesson.exercise === "rythme") return <NoteFigure value="croche" size={26} />;
  if (lesson.exercise === "intervalles") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M4 15c3 0 3-6 6-6s3 6 6 6 4-3 4-3"
          fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
    );
  }
  return <NoteFigure value="noire" size={26} />;
}

function PathNode({ lesson, state, offset, onStart, isNext, tone }) {
  const bg =
    state === "or" ? "var(--mustard)"
      : state === "fait" ? "var(--moss)"
        : state === "ouvert" ? "var(--paper-2)"
          : "var(--sunk)";
  const fg = state === "or" || state === "fait" ? "var(--on-color)" : "var(--ink)";
  const locked = state === "verrouille";
  // Un nœud ouvert doit se distinguer d'un nœud verrouillé sans porter la
  // couleur d'un nœud acquis : on lui donne un anneau à la teinte de l'unité.
  const ring = state === "ouvert" ? `0 0 0 4px ${tone}` : "";
  const lift = locked ? "0 3px 0 var(--edge)" : "0 6px 0 var(--edge)";
  const shadow = ring ? `${ring}, ${lift}` : lift;

  return (
    <div className="relative flex flex-col items-center"
      style={{ transform: `translateX(${offset}px)` }}>
      {isNext && (
        <div className="flex flex-col items-center" style={{ marginBottom: 2 }}>
          <span className="chip" style={{ color: "var(--mustard)", background: "var(--paper)" }}>
            à suivre
          </span>
        </div>
      )}
      <button
        type="button"
        onClick={() => !locked && onStart(lesson)}
        disabled={locked}
        aria-label={`${lesson.title}${locked ? " (verrouillé)" : ""}`}
        style={{
          width: NODE, height: NODE, borderRadius: "50%",
          background: bg, color: fg,
          border: "3px solid var(--edge)",
          boxShadow: shadow,
          display: "grid", placeItems: "center",
          cursor: locked ? "default" : "pointer",
          opacity: locked ? 0.55 : 1,
          transition: "transform 90ms cubic-bezier(.34,1.56,.64,1), box-shadow 90ms",
        }}
        onMouseDown={(e) => {
          if (locked) return;
          e.currentTarget.style.transform = "translateY(6px)";
          e.currentTarget.style.boxShadow = ring || "0 0 0 var(--edge)";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = shadow;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = shadow;
        }}
      >
        <NodeIcon lesson={lesson} state={state} />
      </button>
      <span className="text-center mt-1.5" style={{
        fontSize: "0.74rem", maxWidth: 130, lineHeight: 1.25,
        color: locked ? "var(--ink-3)" : "var(--ink-2)",
      }}>
        {lesson.title}
      </span>
    </div>
  );
}

export default function Path({ progress, onStart, onPractiseWeak, onLegendary }) {
  const states = useMemo(() => lessonStates(progress.path.done), [progress.path.done]);
  const next = useMemo(() => nextLesson(progress.path.done), [progress.path.done]);
  const nextRef = useRef(null);

  // amène la prochaine leçon dans le champ à l'ouverture
  useEffect(() => {
    if (!nextRef.current) return;
    nextRef.current.scrollIntoView({ block: "center", behavior: "auto" });
  }, []);

  const weak = weakItems(progress, "note:", 8);
  const allDone = states.every((l) => l.state === "or" || l.state === "fait");

  let index = 0;

  return (
    <div className="flex flex-col gap-5 w-full max-w-lg mx-auto px-4 pb-16">
      {weak.length >= 4 && (
        <Card className="p-4 flex items-center gap-3">
          <Mascot mood="ecoute" size={54} />
          <div className="flex-1 min-w-0">
            <div className="display" style={{ fontSize: "1rem" }}>Points faibles</div>
            <div className="text-xs" style={{ color: "var(--ink-2)" }}>
              {weak.length} notes vous résistent
            </div>
          </div>
          <Btn size="sm" tone="gold" onClick={onPractiseWeak}>Renforcer</Btn>
        </Card>
      )}

      {allDone && (
        <Card className="p-4 text-center">
          <div className="display" style={{ fontSize: "1.1rem" }}>Programme terminé</div>
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            Repassez les points d'étape en or, ou basculez en Entraînement pour
            les formats chronométrés.
          </p>
        </Card>
      )}

      {UNITS.map((unit) => {
        const up = unitProgress(progress.path.done, unit.id);
        const allGold = unit.lessons.every((l) => progress.path.done[l.id] === "or");
        return (
          <section key={unit.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1">
                <div className="display" style={{ fontSize: "1.15rem", color: unit.tone }}>
                  {unit.title}
                </div>
                <div className="text-xs" style={{ color: "var(--ink-3)" }}>{unit.hint}</div>
              </div>
              <span className="chip mono"
                style={{ color: allGold ? "var(--mustard)" : "var(--ink-3)" }}>
                {allGold ? "en or" : `${up.done}/${up.total}`}
              </span>
            </div>

            <div className="flex flex-col items-center gap-4 py-1">
              {unit.lessons.map((l) => {
                const st = states.find((s) => s.id === l.id);
                const isNext = l.id === next.id;
                const node = (
                  <PathNode key={l.id} lesson={l} state={st.state} tone={unit.tone}
                    offset={offsetFor(index)} onStart={onStart} isNext={isNext} />
                );
                index += 1;
                return isNext
                  ? <div key={l.id} ref={nextRef}>{node}</div>
                  : node;
              })}
            </div>

            {up.complete && !allGold && (
              <Card className="p-3 flex items-center gap-3">
                <span aria-hidden style={{ color: "var(--mustard)" }}>
                  <svg width="26" height="26" viewBox="0 0 24 24">
                    <path d="M12 2.6l2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 16.7 6.4 19.8l1.3-6.3L3 9.2l6.3-.7z"
                      fill="currentColor" stroke="var(--edge)" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="display" style={{ fontSize: "0.95rem" }}>Épreuve légendaire</div>
                  <div className="text-xs" style={{ color: "var(--ink-2)" }}>
                    Sans la moindre erreur et au chrono : l'unité passe en or
                  </div>
                </div>
                <Btn size="sm" tone="gold" onClick={() => onLegendary(unit.id)}>Tenter</Btn>
              </Card>
            )}
          </section>
        );
      })}
    </div>
  );
}
