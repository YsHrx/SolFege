import React from "react";
import { GLYPH, ENGRAVING, STEM } from "./notation.js";

/* ============================================================
   NOTATION

   Deux composants publics :
   — `NoteFigure` / `RestFigure` : un signe isolé, pour les boutons de
     réponse et les listes ;
   — `Staff` : une portée complète avec clef, lignes supplémentaires et
     une ou plusieurs notes.

   Repère interne : un interligne vaut 10 unités et l'axe Y descend.
   Les positions de note sont comptées en degrés depuis la ligne du bas
   (Mi4) : 0 = ligne du bas, 1 = premier interligne, 8 = ligne du haut.
   Négatif ou supérieur à 8 : lignes supplémentaires.
   ============================================================ */

const U = 10; // un interligne

function Path({ name, x = 0, y = 0 }) {
  const g = GLYPH[name];
  if (!g) return null;
  return <path d={g.d} transform={`translate(${x} ${y})`} fill="currentColor" />;
}

/* Composition d'une figure : quelle tête, combien de crochets, un point ? */
const FIGURE = {
  ronde:         { head: "noteheadWhole", stem: false, flags: 0, dot: false },
  blanche:       { head: "noteheadHalf",  stem: true,  flags: 0, dot: false },
  blanche_pointee:{ head: "noteheadHalf", stem: true,  flags: 0, dot: true  },
  noire:         { head: "noteheadBlack", stem: true,  flags: 0, dot: false },
  noire_pointee: { head: "noteheadBlack", stem: true,  flags: 0, dot: true  },
  croche:        { head: "noteheadBlack", stem: true,  flags: 1, dot: false },
  croche_pointee:{ head: "noteheadBlack", stem: true,  flags: 1, dot: true  },
  double:        { head: "noteheadBlack", stem: true,  flags: 2, dot: false },
};

const REST_GLYPH = {
  pause: "restWhole",
  demi_pause: "restHalf",
  soupir: "restQuarter",
  demi_soupir: "rest8th",
  quart_soupir: "rest16th",
};

/* Longueur de hampe : 3,5 interlignes, allongée d'un demi-interligne par
   crochet supplémentaire pour que le second crochet ne morde pas la tête. */
function stemLength(flags) {
  return STEM.length + Math.max(0, flags - 1) * 6;
}

/**
 * Un signe de note isolé, hampe vers le haut, dessiné dans sa propre
 * boîte. `size` est la hauteur rendue en pixels.
 */
export function NoteFigure({ value, size = 46, className = "", title }) {
  const f = FIGURE[value] || FIGURE.noire;
  const head = GLYPH[f.head];
  const len = stemLength(f.flags);
  const stemTop = -len;

  // Cadre COMMUN à toutes les figures. Une boîte ajustée à chaque signe
  // les mettrait toutes à la même hauteur rendue, et la ronde — qui n'a
  // pas de hampe — apparaîtrait quatre fois plus grosse que la noire.
  // Ici elles partagent une échelle : les tailles relatives sont justes,
  // et les boutons de réponse s'alignent.
  const vb = [-2, -46, 28, 55];

  return (
    <svg
      viewBox={vb.join(" ")}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "block", overflow: "visible" }}
    >
      <Path name={f.head} />
      {f.stem && (
        <rect
          x={STEM.upX - ENGRAVING.stem / 2}
          y={stemTop}
          width={ENGRAVING.stem}
          height={len}
          fill="currentColor"
        />
      )}
      {f.flags > 0 && (
        <Path
          name={f.flags === 1 ? "flag8thUp" : "flag16thUp"}
          x={STEM.upX - ENGRAVING.stem / 2}
          y={stemTop}
        />
      )}
      {f.dot && <Path name="augmentationDot" x={head.box[2] + 3} y={-U / 2} />}
    </svg>
  );
}

/** Un silence isolé. */
export function RestFigure({ value, size = 46, className = "", title }) {
  const name = REST_GLYPH[value] || "restQuarter";
  const g = GLYPH[name];
  const pad = 1.5;
  const vb = [
    g.box[0] - pad,
    g.box[1] - pad,
    g.box[2] - g.box[0] + pad * 2,
    g.box[3] - g.box[1] + pad * 2,
  ];
  return (
    <svg viewBox={vb.join(" ")} height={size} className={className}
      role={title ? "img" : undefined} aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ display: "block", overflow: "visible" }}>
      <Path name={name} />
    </svg>
  );
}

/** La clef de sol seule, son origine posée sur la ligne de Sol. */
export function TrebleClef({ x = 0, y = 0 }) {
  return <Path name="gClef" x={x} y={y} />;
}

/* ============================================================
   PORTÉE
   ============================================================ */

const CLEF_TOP_ABOVE_G = -GLYPH.gClef.box[1] / U;   // 4,39 interlignes
const CLEF_BELOW_G = GLYPH.gClef.box[3] / U;        // 2,63 interlignes

/**
 * Une portée en clé de sol.
 *
 * @param notes   [{ position, value, state, accidental }]
 * @param spacing interligne, en pixels
 * @param slots   nombre d'emplacements réservés (pour qu'une mesure
 *                partiellement remplie garde sa largeur)
 */
export function Staff({
  notes = [],
  spacing = 16,
  slots,
  showClef = true,
  className = "",
  ariaLabel,
}) {
  const k = spacing / U;
  const count = Math.max(1, slots || notes.length || 1);

  // La ligne de Sol est le 2e degré : une fois la clef posée dessus, on
  // sait de combien elle déborde en haut et en bas.
  const clefAbove = showClef ? CLEF_TOP_ABOVE_G - 1 : 0;   // au-dessus de la ligne du bas
  const clefBelow = showClef ? CLEF_BELOW_G + 1 : 0;       // sous la ligne du bas

  // Débordement dû aux notes : hampes, crochets et lignes supplémentaires.
  let noteAbove = 4, noteBelow = 0; // au minimum, la hauteur de la portée
  for (const n of notes) {
    const p = n.position;
    const up = p <= 4;
    const headAbove = p / 2;
    noteAbove = Math.max(noteAbove, headAbove + (up ? stemLength(0) / U + 1 : 1));
    noteBelow = Math.max(noteBelow, -headAbove + (up ? 1 : stemLength(0) / U + 1));
  }

  const padTop = Math.max(clefAbove - 4, noteAbove - 4, 1) + 0.6;
  const padBottom = Math.max(clefBelow, noteBelow, 1) + 0.6;

  const topLineY = padTop * spacing;
  const bottomLineY = topLineY + 4 * spacing;
  const height = bottomLineY + padBottom * spacing;
  const yOf = (p) => bottomLineY - (p * spacing) / 2;

  const clefW = showClef ? GLYPH.gClef.box[2] * k : 0;
  const leftPad = spacing * 0.5;
  const noteZoneStart = leftPad + clefW + spacing * 1.2;
  // une altération occupe un peu plus d'un interligne devant sa note :
  // sans cette marge, elle viendrait mordre la note précédente
  const hasAccidental = notes.some((n) => n.accidental);
  const step = spacing * (hasAccidental ? 3.9 : 2.6);
  const width = noteZoneStart + step * count + spacing * 0.8;

  // `spacing` est un interligne EN PIXELS : la portée se rend à sa taille
  // naturelle et ne se dilate pas pour remplir un conteneur large. Elle
  // rétrécit en revanche sur un écran étroit.
  return (
    <svg
      viewBox={`0 0 ${Math.round(width)} ${Math.round(height)}`}
      className={className}
      role="img"
      aria-label={ariaLabel || "Portée en clé de sol"}
      style={{
        display: "block", width: "100%", maxWidth: Math.round(width),
        height: "auto", margin: "0 auto", overflow: "visible",
      }}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const y = topLineY + i * spacing;
        return (
          <rect key={i} x="0" y={y - (ENGRAVING.staffLine * k) / 2}
            width={width} height={ENGRAVING.staffLine * k} fill="var(--ink)" />
        );
      })}

      {showClef && (
        <g transform={`translate(${leftPad} ${yOf(2)}) scale(${k})`} color="var(--ink)">
          <TrebleClef />
        </g>
      )}

      {notes.map((n, i) => (
        <StaffNote
          key={i}
          note={n}
          x={noteZoneStart + step * i + step / 2}
          y={yOf(n.position)}
          k={k}
          spacing={spacing}
          width={width}
        />
      ))}
    </svg>
  );
}

function StaffNote({ note, x, y, k, spacing }) {
  const { position, value = "noire", state, accidental } = note;
  const f = FIGURE[value] || FIGURE.noire;
  const head = GLYPH[f.head];
  const headW = head.box[2] * k;

  const color =
    state === "good" ? "var(--moss)" : state === "bad" ? "var(--brick)" : "var(--ink)";

  // La hampe monte sous la ligne médiane, descend au-dessus : c'est la
  // règle de gravure, et elle garde la note dans le cadre.
  const up = position <= 4;
  const len = stemLength(f.flags) * k;
  // Les ancrages SMuFL sont donnés depuis l'ORIGINE de la tête, c'est-à-dire
  // son bord gauche — pas son centre. La tête étant centrée sur x, il faut
  // repartir de ce bord, sinon la hampe se détache sur la droite.
  const headLeft = x - headW / 2;
  const stemX = headLeft + (up ? STEM.upX : STEM.downX) * k - (ENGRAVING.stem * k) / 2;
  const stemY = up ? y - len : y;

  // Lignes supplémentaires : un degré pair sur deux au-delà de la portée.
  const ledgers = [];
  if (position < 0) for (let p = -2; p >= position; p -= 2) ledgers.push(p);
  else if (position > 8) for (let p = 10; p <= position; p += 2) ledgers.push(p);
  const ledgerHalf = headW / 2 + ENGRAVING.ledgerExtension * k;

  return (
    <g color={color} style={{ transition: "color 140ms" }}>
      {ledgers.map((p) => {
        const ly = y + ((position - p) * spacing) / 2;
        return (
          <rect key={p}
            x={x - ledgerHalf} y={ly - (ENGRAVING.ledgerLine * k) / 2}
            width={ledgerHalf * 2} height={ENGRAVING.ledgerLine * k}
            fill="var(--ink)" />
        );
      })}

      {accidental && (
        <g transform={`translate(${x - headW / 2 - spacing * 1.15} ${y}) scale(${k})`}>
          <Path name={
            accidental === "#" ? "accidentalSharp"
              : accidental === "b" ? "accidentalFlat" : "accidentalNatural"
          } />
        </g>
      )}

      <g transform={`translate(${headLeft} ${y}) scale(${k})`}>
        <Path name={f.head} />
        {/* le point se place dans un interligne : si la note est sur une
            ligne (degré pair), il monte d'un demi-interligne */}
        {f.dot && <Path name="augmentationDot" x={head.box[2] + 3} y={position % 2 === 0 ? -U / 2 : 0} />}
      </g>

      {f.stem && (
        <rect x={stemX} y={stemY} width={ENGRAVING.stem * k} height={len} fill="currentColor" />
      )}

      {f.flags > 0 && (
        <g transform={`translate(${stemX} ${up ? stemY : stemY + len}) scale(${k})`}>
          <Path name={
            f.flags === 1
              ? (up ? "flag8thUp" : "flag8thDown")
              : (up ? "flag16thUp" : "flag16thDown")
          } />
        </g>
      )}
    </g>
  );
}
