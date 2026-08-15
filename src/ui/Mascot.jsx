import React from "react";

/* ============================================================
   LA CROCHE

   La mascotte. Une croche anthropomorphe plutôt qu'un violon à
   pattes : elle est le sujet même de l'application, elle tient en une
   vingtaine de traits, et elle peut venir se poser sur la portée
   pendant un exercice.

   Contrairement à la notation — qui reste gravée et juste — la mascotte
   relève de l'interface : gros contour d'encre, aplat saturé posé
   légèrement de travers, aucune ombre floue.

   Repère : boîte 100 × 128, la tête centrée en (44, 88).
   ============================================================ */

const HEAD = { cx: 44, cy: 88, rx: 30, ry: 23, tilt: -12 };
const OUTLINE = 5;

const MOOD = {
  repos:    { fill: "var(--mustard)", eyes: "ronds",   mouth: "neutre" },
  ecoute:   { fill: "var(--blue)",    eyes: "ronds",   mouth: "petit"  },
  content:  { fill: "var(--moss)",    eyes: "arcs",    mouth: "sourire" },
  ravi:     { fill: "var(--moss)",    eyes: "arcs",    mouth: "grand"  },
  rate:     { fill: "var(--brick)",   eyes: "croix",   mouth: "grimace" },
  endormi:  { fill: "var(--ink-3)",   eyes: "fermes",  mouth: "neutre" },
};

function Eyes({ kind }) {
  const s = { stroke: "var(--edge)", strokeWidth: 4.2, strokeLinecap: "round", fill: "none" };
  switch (kind) {
    case "arcs":
      return (
        <>
          <path d="M25 82q7-8 14 0" {...s} />
          <path d="M46 85q7-8 14 0" {...s} />
        </>
      );
    case "croix":
      return (
        <>
          <path d="M26 79l11 9M37 79l-11 9" {...s} />
          <path d="M48 81l11 9M59 81l-11 9" {...s} />
        </>
      );
    case "fermes":
      return (
        <>
          <path d="M25 85q7 6 14 0" {...s} />
          <path d="M46 88q7 6 14 0" {...s} />
        </>
      );
    default:
      return (
        <>
          <circle cx="32" cy="84" r="4.6" fill="var(--edge)" />
          <circle cx="53" cy="87" r="4.6" fill="var(--edge)" />
        </>
      );
  }
}

function Mouth({ kind }) {
  const s = { stroke: "var(--edge)", strokeWidth: 4.2, strokeLinecap: "round", fill: "none" };
  switch (kind) {
    case "sourire": return <path d="M32 97q10 9 20 1" {...s} />;
    case "grand":   return <path d="M30 95q12 16 24 2q-12 5-24-2z" fill="var(--edge)" stroke="none" />;
    case "grimace": return <path d="M33 103q9-8 18-1" {...s} />;
    case "petit":   return <circle cx="42" cy="99" r="4" fill="var(--edge)" />;
    default:        return <path d="M33 99h17" {...s} />;
  }
}

/**
 * @param mood   repos | ecoute | content | ravi | rate | endormi
 * @param size   hauteur en pixels
 * @param blink  fait cligner la croche au repos
 */
export function Mascot({ mood = "repos", size = 96, className = "", blink = true, label }) {
  const m = MOOD[mood] || MOOD.repos;
  const idle = mood === "repos" && blink;

  return (
    <svg
      viewBox="0 0 100 128"
      height={size}
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: "block", overflow: "visible" }}
    >
      {/* hampe et crochet — le « corps » et le « bras » */}
      <path
        d={mood === "endormi" ? "M71 92V44" : "M71 88V20"}
        stroke="var(--edge)" strokeWidth={OUTLINE + 1.5} strokeLinecap="round" fill="none"
      />
      <path
        d={
          mood === "ravi"
            ? "M71 22c16 2 22 -8 20 -18"        // le bras se lève
            : mood === "endormi"
              ? "M71 46c11 5 14 13 12 22"
              : "M71 22c15 7 19 18 17 32"
        }
        stroke="var(--edge)" strokeWidth={OUTLINE + 1.5} strokeLinecap="round" fill="none"
      />

      {/* tête : l'aplat est posé 1,5 px en biais du contour, comme un
          coloriage au feutre qui dépasse — c'est ce décalage qui fait
          « dessiné » plutôt que « vectoriel » */}
      <ellipse
        cx={HEAD.cx - 1.5} cy={HEAD.cy + 1.5} rx={HEAD.rx} ry={HEAD.ry}
        transform={`rotate(${HEAD.tilt} ${HEAD.cx} ${HEAD.cy})`}
        fill={m.fill}
      />
      <ellipse
        cx={HEAD.cx} cy={HEAD.cy} rx={HEAD.rx} ry={HEAD.ry}
        transform={`rotate(${HEAD.tilt} ${HEAD.cx} ${HEAD.cy})`}
        fill="none" stroke="var(--edge)" strokeWidth={OUTLINE}
      />

      <g style={idle ? { animation: "blink 4.5s ease-in-out infinite", transformOrigin: "44px 86px" } : undefined}>
        <Eyes kind={m.eyes} />
      </g>
      <Mouth kind={m.mouth} />

      {/* le Z de la croche endormie */}
      {mood === "endormi" && (
        <text x="80" y="34" fontSize="26" fontFamily="Baloo, sans-serif"
          fontWeight="800" fill="var(--ink-3)">z</text>
      )}
    </svg>
  );
}

export default Mascot;
