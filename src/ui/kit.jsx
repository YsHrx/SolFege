import React, { useEffect, useRef, useState } from "react";
import { NoteFigure } from "./Glyphs.jsx";

/* ============================================================
   PIÈCES D'INTERFACE PARTAGÉES
   ============================================================ */

export function Btn({ tone, size, block, className = "", ...rest }) {
  const cls = [
    "btn",
    tone ? `btn-${tone}` : "",
    size === "sm" ? "btn-sm" : "",
    block ? "btn-block" : "",
    className,
  ].filter(Boolean).join(" ");
  return <button type="button" className={cls} {...rest} />;
}

export function Card({ sunk, flat, className = "", ...rest }) {
  const cls = ["card", sunk ? "card-sunk" : "", flat ? "card-flat" : "", className]
    .filter(Boolean).join(" ");
  return <div className={cls} {...rest} />;
}

/** Rail de choix exclusifs. */
export function Segmented({ value, onChange, options, ariaLabel }) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   LES TROIS FAUSSES NOTES

   L'équivalent des cœurs, dans le vocabulaire de l'instrument : une
   corde intacte, une corde cassée.
   ============================================================ */
export function Hearts({ left, max = 3 }) {
  return (
    <div className="flex items-center gap-1" role="img"
      aria-label={`${left} fausse${left > 1 ? "s" : ""} note${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""}`}>
      {Array.from({ length: max }).map((_, i) => {
        const alive = i < left;
        return (
          <svg key={i} width="19" height="19" viewBox="0 0 20 20" aria-hidden
            style={{ transition: "opacity 200ms", opacity: alive ? 1 : 0.28 }}>
            {alive ? (
              <path d="M10 2v16" stroke="var(--brick)" strokeWidth="3.4" strokeLinecap="round" />
            ) : (
              <>
                <path d="M10 2v5.5" stroke="var(--ink-3)" strokeWidth="3.4" strokeLinecap="round" />
                <path d="M6.6 9.4 13 12" stroke="var(--ink-3)" strokeWidth="2.6" strokeLinecap="round" />
                <path d="M10 18v-5.5" stroke="var(--ink-3)" strokeWidth="3.4" strokeLinecap="round" />
              </>
            )}
          </svg>
        );
      })}
    </div>
  );
}

/** Barre de progression de la leçon. Elle flashe à chaque avancée : sans
    ce clignotement, un pas de 8 % passe complètement inaperçu. */
export function Gauge({ value, tone = "var(--mustard)" }) {
  const [flash, setFlash] = useState(false);
  const previous = useRef(value);
  useEffect(() => {
    if (value > previous.current) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 280);
      previous.current = value;
      return () => clearTimeout(t);
    }
    previous.current = value;
    return undefined;
  }, [value]);

  return (
    <div className="gauge flex-1">
      <i className={flash ? "anim-flash" : ""}
        style={{ width: `${Math.max(3, Math.round(value * 100))}%`, background: tone }} />
    </div>
  );
}

/* ============================================================
   COMBO

   Le compteur de bonnes réponses consécutives. Il s'appelle « combo »
   et non « série » : la série, c'est le nombre de jours de pratique, et
   confondre les deux était l'un des défauts de la version précédente.
   ============================================================ */
export function ComboBadge({ value }) {
  const strong = value >= 5;
  return (
    <span className="chip mono" style={{
      color: strong ? "var(--mustard)" : "var(--ink-3)",
      transition: "color 180ms",
    }}>
      combo {value}
    </span>
  );
}

/** Bannière qui traverse l'écran aux paliers de combo. */
export function ComboBanner({ combo }) {
  const [shown, setShown] = useState(null);
  const seen = useRef(0);
  useEffect(() => {
    if (combo > seen.current && combo > 0 && combo % 5 === 0) {
      setShown(combo);
      const t = setTimeout(() => setShown(null), 1100);
      seen.current = combo;
      return () => clearTimeout(t);
    }
    if (combo < seen.current) seen.current = combo;
    return undefined;
  }, [combo]);

  if (!shown) return null;
  return (
    <div className="anim-pop" aria-hidden style={{
      position: "fixed", left: 0, right: 0, top: "34%", zIndex: 50,
      display: "flex", justifyContent: "center", pointerEvents: "none",
    }}>
      <div className="display" style={{
        background: "var(--mustard)", color: "#17160f",
        border: "3px solid var(--edge)", borderRadius: 18,
        boxShadow: "6px 6px 0 var(--edge)",
        padding: "0.6rem 1.6rem", fontSize: "1.6rem",
      }}>
        Combo ×{shown}
      </div>
    </div>
  );
}

/* ============================================================
   CHIFFRES QUI COMPTENT

   Faire défiler un total de zéro à sa valeur change complètement la
   sensation d'un écran de fin — c'est le détail le plus rentable de
   toute la panoplie.
   ============================================================ */
export function CountUp({ to, duration = 750, suffix = "", delay = 0 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setN(to); return undefined; }
    let raf = 0;
    let start = 0;
    const step = (t) => {
      if (!start) start = t;
      const e = t - start - delay;
      if (e < 0) { raf = requestAnimationFrame(step); return; }
      const p = Math.min(1, e / duration);
      // sortie douce : le chiffre ralentit en approchant de sa valeur
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, delay]);
  return <span className="mono">{n}{suffix}</span>;
}

/* ============================================================
   PLUIE DE CROCHES

   À la place de confettis génériques : de vraies croches qui giclent et
   retombent en tournant.
   ============================================================ */
export function NoteRain({ count = 26 }) {
  const [bits] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 6 + Math.random() * 88,
      delay: Math.random() * 420,
      dur: 1500 + Math.random() * 1100,
      spin: (Math.random() > 0.5 ? 1 : -1) * (180 + Math.random() * 360),
      size: 18 + Math.random() * 18,
      tone: ["var(--mustard)", "var(--moss)", "var(--blue)", "var(--brick)"][i % 4],
      value: ["croche", "double", "noire"][i % 3],
    }))
  );

  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return null;

  return (
    <div aria-hidden style={{
      position: "fixed", inset: 0, zIndex: 40, pointerEvents: "none", overflow: "hidden",
    }}>
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-12vh) rotate(0deg); opacity: 0; }
          12%  { opacity: 1; }
          100% { transform: translateY(108vh) rotate(var(--spin)); opacity: 0; }
        }
      `}</style>
      {bits.map((b) => (
        <div key={b.id} style={{
          position: "absolute", left: `${b.x}%`, top: 0, color: b.tone,
          "--spin": `${b.spin}deg`,
          animation: `fall ${b.dur}ms cubic-bezier(.4,.05,.6,1) ${b.delay}ms forwards`,
        }}>
          <NoteFigure value={b.value} size={b.size} />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   BARRE DE LEÇON
   ============================================================ */
export function LessonBar({ onQuit, progress, hearts, heartsOn, combo, right }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setConfirming(true)}
          aria-label="Quitter la leçon"
          style={{
            background: "none", border: "none", padding: 4,
            color: "var(--ink-3)", fontSize: 22, lineHeight: 1,
          }}>
          ✕
        </button>
        {progress != null
          ? <Gauge value={progress} />
          : <div className="flex-1">{right}</div>}
        {heartsOn ? <Hearts left={hearts} /> : combo != null ? <ComboBadge value={combo} /> : null}
      </div>
      {progress != null && right ? (
        <div className="flex justify-center">{right}</div>
      ) : null}

      {confirming && (
        <Card className="p-3 flex items-center gap-2 anim-rise">
          <span className="text-sm flex-1">Quitter la leçon ?</span>
          <Btn size="sm" onClick={() => setConfirming(false)}>Continuer</Btn>
          <Btn size="sm" tone="brick" onClick={onQuit}>Quitter</Btn>
        </Card>
      )}
    </div>
  );
}

/** Décor d'en-tête : cinq lignes de portée, très pâles. */
export function StaffLines({ top = 0, height = 100 }) {
  return (
    <div aria-hidden style={{
      position: "absolute", left: 0, right: 0, top, height, pointerEvents: "none",
    }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} style={{
          position: "absolute", left: 0, right: 0,
          top: `${(i * height) / 4}px`, height: 2, background: "var(--rule)", opacity: 0.7,
        }} />
      ))}
    </div>
  );
}
