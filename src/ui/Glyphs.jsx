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

/* Quel signe, et sur quel degré il s'ancre. Doit rester aligné avec
   CLEFS dans music/notes.js. */
const CLEF_GLYPH = {
  sol: { glyph: "gClef", origin: 2 },
  ut3: { glyph: "cClef", origin: 4 },
  fa: { glyph: "fClef", origin: 6 },
};

/* ============================================================
   PORTÉE
   ============================================================ */

/* ============================================================
   ARMURES

   Les altérations d'une armure ne se posent pas n'importe où : leur
   ordre et leur hauteur sont fixés par l'usage. En clé de sol, les
   dièses suivent Fa Do Sol Ré La Mi Si et les bémols l'ordre inverse,
   chacun à une position convenue qui garde l'armure compacte autour de
   la portée.

   Positions en degrés depuis la ligne du bas (Mi4 = 0).
   ============================================================ */
const KEY_SIG_POSITIONS = {
  sol: {
    "#": [8, 5, 9, 6, 3, 7, 4],   // Fa5 Do5 Sol5 Ré5 La4 Mi5 Si4
    b: [4, 7, 3, 6, 2, 5, 1],     // Si4 Mi5 La4 Ré5 Sol4 Do5 Fa4
  },
  ut3: {
    "#": [7, 4, 8, 5, 2, 6, 3],
    b: [3, 6, 2, 5, 1, 4, 0],
  },
  fa: {
    "#": [6, 3, 7, 4, 1, 5, 2],
    b: [2, 5, 1, 4, 0, 3, -1],
  },
};

/** Les tonalités majeures, dans l'ordre du cycle des quintes. */
export const KEY_SIGNATURES = [
  { count: 0, type: "#", major: "Do majeur", minor: "La mineur" },
  { count: 1, type: "#", major: "Sol majeur", minor: "Mi mineur" },
  { count: 2, type: "#", major: "Ré majeur", minor: "Si mineur" },
  { count: 3, type: "#", major: "La majeur", minor: "Fa♯ mineur" },
  { count: 4, type: "#", major: "Mi majeur", minor: "Do♯ mineur" },
  { count: 5, type: "#", major: "Si majeur", minor: "Sol♯ mineur" },
  { count: 1, type: "b", major: "Fa majeur", minor: "Ré mineur" },
  { count: 2, type: "b", major: "Si♭ majeur", minor: "Sol mineur" },
  { count: 3, type: "b", major: "Mi♭ majeur", minor: "Do mineur" },
  { count: 4, type: "b", major: "La♭ majeur", minor: "Fa mineur" },
  { count: 5, type: "b", major: "Ré♭ majeur", minor: "Si♭ mineur" },
];

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
  clef = "sol",
  keySignature = null,   // { count, type: "#" | "b" }
  chord = false,         // toutes les notes sur le même temps
  className = "",
  ariaLabel,
}) {
  const k = spacing / U;
  const count = Math.max(1, slots || notes.length || 1);

  const clefDef = CLEF_GLYPH[clef] || CLEF_GLYPH.sol;
  // Le signe est posé sur son degré d'ancrage : on en déduit ce qu'il
  // déborde au-dessus et au-dessous de la portée.
  const gTop = -GLYPH[clefDef.glyph].box[1] / U;
  const gBottom = GLYPH[clefDef.glyph].box[3] / U;
  const clefAbove = showClef ? gTop + clefDef.origin / 2 : 0;
  const clefBelow = showClef ? gBottom - clefDef.origin / 2 : 0;

  // Débordement dû aux notes : hampes, crochets et lignes supplémentaires.
  let noteAbove = 4, noteBelow = 0; // au minimum, la hauteur de la portée
  const stemUnits = stemLength(0) / U;
  if (chord && notes.length) {
    /* Un accord ne porte qu'une hampe, et son sens dépend de la MOYENNE
       des deux têtes — pas de chaque tête prise à part. Calculer la marge
       note par note faisait sortir la hampe hors du cadre sur les sixtes
       et les septièmes, où elle traversait la carte. */
    const ps = notes.map((n) => n.position);
    const lo = Math.min(...ps) / 2;
    const hi = Math.max(...ps) / 2;
    const up = (Math.min(...ps) + Math.max(...ps)) / 2 <= 4;
    noteAbove = Math.max(noteAbove, hi + (up ? stemUnits : 1));
    noteBelow = Math.max(noteBelow, -lo + (up ? 1 : stemUnits));
  } else {
    for (const n of notes) {
      const p = n.position;
      const up = p <= 4;
      const headAbove = p / 2;
      noteAbove = Math.max(noteAbove, headAbove + (up ? stemUnits + 1 : 1));
      noteBelow = Math.max(noteBelow, -headAbove + (up ? 1 : stemUnits + 1));
    }
  }

  const padTop = Math.max(clefAbove - 4, noteAbove - 4, 1) + 0.6;
  const padBottom = Math.max(clefBelow, noteBelow, 1) + 0.6;

  const topLineY = padTop * spacing;
  const bottomLineY = topLineY + 4 * spacing;
  const height = bottomLineY + padBottom * spacing;
  const yOf = (p) => bottomLineY - (p * spacing) / 2;

  const clefW = showClef ? GLYPH[clefDef.glyph].box[2] * k : 0;
  const leftPad = spacing * 0.5;

  // armure : une altération par degré, serrées les unes contre les autres
  const sigPositions = keySignature && keySignature.count > 0
    ? (KEY_SIG_POSITIONS[clef] || KEY_SIG_POSITIONS.sol)[keySignature.type]
      .slice(0, keySignature.count)
    : [];
  const sigGlyph = keySignature && keySignature.type === "b"
    ? "accidentalFlat" : "accidentalSharp";
  /* L'écart entre deux altérations se déduit de la largeur RÉELLE du
     signe, pas d'une fraction d'interligne choisie à l'œil : un dièse
     Bravura fait presque un interligne de large, et à 0,66 les cinq
     dièses de Si majeur se chevauchaient les uns les autres. */
  const sigStep = (GLYPH[sigGlyph].box[2] / U + 0.14) * spacing;
  const sigStart = leftPad + clefW + spacing * 0.5;
  const sigW = sigPositions.length ? sigPositions.length * sigStep + spacing * 0.4 : 0;

  const noteZoneStart = sigStart + sigW + spacing * 0.9;
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
        <g transform={`translate(${leftPad} ${yOf(clefDef.origin)}) scale(${k})`} color="var(--ink)">
          <Path name={clefDef.glyph} />
        </g>
      )}

      {sigPositions.map((p, i) => (
        <g key={i} transform={`translate(${sigStart + i * sigStep} ${yOf(p)}) scale(${k})`}
          color="var(--ink)">
          <Path name={sigGlyph} />
        </g>
      ))}

      {/* Un accord n'est pas une suite : les têtes se superposent sur le
          même temps, et une seule hampe les relie. Les étaler côte à côte
          se lirait « deux notes l'une après l'autre ». */}
      {chord && notes.length > 1 ? (
        <ChordNotes notes={notes} x={noteZoneStart + step / 2}
          yOf={yOf} k={k} spacing={spacing} />
      ) : (
        notes.map((n, i) => (
          <StaffNote
            key={i}
            note={n}
            x={noteZoneStart + step * i + step / 2}
            y={yOf(n.position)}
            k={k}
            spacing={spacing}
            width={width}
          />
        ))
      )}
    </svg>
  );
}

/* ============================================================
   PORTÉE RYTHMIQUE

   Pour les motifs : le chiffrage de mesure, puis les figures posées sur
   la ligne médiane et les silences à leur place d'usage. On ne montre
   pas de hauteurs — il n'y en a pas à lire, et en poser une donnerait à
   croire qu'elle compte.
   ============================================================ */

/** Où se pose chaque silence, en degrés depuis la ligne du bas. */
const REST_POSITION = {
  pause: 6,          // suspendu sous la 4e ligne
  demi_pause: 4,     // posé sur la ligne médiane
  soupir: 4,
  soupir_pointe: 4,
  demi_soupir: 4,
  quart_soupir: 4,
};

const REST_NAME = {
  pause: "restWhole",
  demi_pause: "restHalf",
  soupir: "restQuarter",
  soupir_pointe: "restQuarter",
  demi_soupir: "rest8th",
  quart_soupir: "rest16th",
};

function TimeSignature({ top, bottom, x, y, k }) {
  const digits = (n) => String(n).split("").map((d) => `timeSig${d}`);
  const row = (names, cy) => {
    const w = names.reduce((a, n) => a + GLYPH[n].box[2], 0);
    let cx = -w / 2;
    return names.map((n, i) => {
      const el = <g key={i} transform={`translate(${cx} ${cy})`}><Path name={n} /></g>;
      cx += GLYPH[n].box[2];
      return el;
    });
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`} color="var(--ink)">
      {/* le chiffre du haut se centre sur le 2e interligne, celui du bas
          sur le 4e — c'est la convention de gravure */}
      {row(digits(top), -10)}
      {row(digits(bottom), 10)}
    </g>
  );
}

/**
 * @param pattern [{ value, rest }] — les durées, dans l'ordre
 * @param meter   { top, bottom } — le chiffrage affiché
 * @param cursor  index de l'élément mis en avant, ou -1
 */
export function RhythmStaff({
  pattern = [],
  meter = { top: 4, bottom: 4 },
  spacing = 15,
  cursor = -1,
  state = null,
  className = "",
  ariaLabel,
}) {
  const k = spacing / U;
  const padTop = 2.2;
  const padBottom = 2.6;
  const topLineY = padTop * spacing;
  const bottomLineY = topLineY + 4 * spacing;
  const height = bottomLineY + padBottom * spacing;
  const yOf = (p) => bottomLineY - (p * spacing) / 2;

  const leftPad = spacing * 0.9;
  const sigX = leftPad + spacing * 0.85;
  const start = sigX + spacing * 2.1;

  /* Placement mi-proportionnel, mi-régulier. Une répartition purement
     proportionnelle à la durée est juste en théorie mais tasse les
     croches les unes sur les autres ; une répartition régulière ment sur
     les durées. Les graveurs font le compromis, on le fait aussi. */
  const totalBeats = pattern.reduce((a, s) => a + s.value.beats, 0) || 1;
  const n = pattern.length;
  const zone = spacing * 2.3 * Math.max(4, n);
  const width = start + zone + spacing * 1.4;
  const MIX = 0.55; // part de la durée dans le placement

  let cum = 0;
  const placed = pattern.map((s, i) => {
    const byTime = cum / totalBeats + s.value.beats / totalBeats / 2;
    const byRank = (i + 0.5) / n;
    const x = start + (byTime * MIX + byRank * (1 - MIX)) * zone;
    cum += s.value.beats;
    return { ...s, x };
  });

  const color =
    state === "good" ? "var(--moss)" : state === "bad" ? "var(--brick)" : "var(--ink)";

  return (
    <svg viewBox={`0 0 ${Math.round(width)} ${Math.round(height)}`} className={className}
      role="img" aria-label={ariaLabel || "Motif rythmique"}
      style={{
        display: "block", width: "100%", maxWidth: Math.round(width),
        height: "auto", margin: "0 auto", overflow: "visible",
      }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="0" y={topLineY + i * spacing - (ENGRAVING.staffLine * k) / 2}
          width={width} height={ENGRAVING.staffLine * k} fill="var(--ink)" />
      ))}

      <TimeSignature top={meter.top} bottom={meter.bottom} x={sigX} y={yOf(4)} k={k} />

      <g color={color} style={{ transition: "color 140ms" }}>
        {placed.map((s, i) => {
          const hot = i === cursor;
          const op = cursor >= 0 && !hot ? 0.35 : 1;
          if (s.rest) {
            const restId = s.value.id === "noire_pointee" ? "soupir_pointe"
              : { ronde: "pause", blanche: "demi_pause", noire: "soupir",
                croche: "demi_soupir", double: "quart_soupir" }[s.value.id] || "soupir";
            const g = GLYPH[REST_NAME[restId]];
            return (
              <g key={i} opacity={op}>
                <g transform={`translate(${s.x - (g.box[2] * k) / 2} ${yOf(REST_POSITION[restId])}) scale(${k})`}>
                  <Path name={REST_NAME[restId]} />
                  {restId === "soupir_pointe" && (
                    <Path name="augmentationDot" x={g.box[2] + 3} y={-U / 2} />
                  )}
                </g>
              </g>
            );
          }
          return (
            <g key={i} opacity={op}>
              <StaffNote
                note={{ position: 4, value: s.value.id }}
                x={s.x} y={yOf(4)} k={k} spacing={spacing}
                forceStemDown
              />
            </g>
          );
        })}
      </g>

      {/* barre de mesure finale */}
      <rect x={width - spacing * 0.5} y={topLineY}
        width={ENGRAVING.barlineThick * k} height={4 * spacing} fill="var(--ink)" />
    </svg>
  );
}

/* Un accord : les têtes empilées, une hampe unique qui part de la note
   extrême. La hampe monte si le centre de l'accord est sous la ligne
   médiane, exactement comme pour une note seule. */
function ChordNotes({ notes, x, yOf, k, spacing }) {
  const sorted = [...notes].sort((a, b) => a.position - b.position);
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  const middle = (lowest.position + highest.position) / 2;
  const up = middle <= 4;

  const head = GLYPH.noteheadBlack;
  const headW = head.box[2] * k;
  const w = ENGRAVING.stem * k;
  const len = STEM.length * k;
  const stemX = x - headW / 2 + (up ? STEM.upX : STEM.downX) * k - w / 2;
  /* La hampe part de la tête opposée à son sens et dépasse l'autre d'une
     longueur pleine : elle grandit donc avec l'écart de l'accord, au lieu
     d'être rognée par lui (une neuvième donnait une hauteur négative, et
     le trait disparaissait). */
  const stemTop = up ? yOf(highest.position) - len : yOf(highest.position);
  const stemBottom = up ? yOf(lowest.position) : yOf(lowest.position) + len;

  const state = notes.find((n) => n.state)?.state;
  const color =
    state === "good" ? "var(--moss)" : state === "bad" ? "var(--brick)" : "var(--ink)";

  return (
    <g color={color} style={{ transition: "color 140ms" }}>
      {sorted.map((n, i) => (
        <StaffNote key={i} note={{ ...n, value: "noire", state: null }}
          x={x} y={yOf(n.position)} k={k} spacing={spacing} hideStem />
      ))}
      <rect x={stemX} y={stemTop} width={w} height={stemBottom - stemTop}
        fill="currentColor" />
    </g>
  );
}

function StaffNote({ note, x, y, k, spacing, forceStemDown, hideStem }) {
  const { position, value = "noire", state, accidental } = note;
  const f = FIGURE[value] || FIGURE.noire;
  const head = GLYPH[f.head];
  const headW = head.box[2] * k;

  const color =
    state === "good" ? "var(--moss)" : state === "bad" ? "var(--brick)" : "var(--ink)";

  // La hampe monte sous la ligne médiane, descend au-dessus : c'est la
  // règle de gravure, et elle garde la note dans le cadre. Sur une portée
  // rythmique tout est sur la ligne médiane, où la convention est de
  // descendre la hampe.
  const up = forceStemDown ? false : position <= 4;
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

      {f.stem && !hideStem && (
        <rect x={stemX} y={stemY} width={ENGRAVING.stem * k} height={len} fill="currentColor" />
      )}

      {f.flags > 0 && !hideStem && (
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
