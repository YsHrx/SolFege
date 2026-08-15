import React, { useMemo, useState } from "react";

/* ============================================================
   COURBE DE PROGRESSION

   Une seule série — la précision par leçon — donc pas de légende : le
   titre nomme la donnée. Trait fin, grille discrète, dernier point mis
   en avant, et un survol qui donne la valeur exacte. Les chiffres et
   les étiquettes restent en encre : c'est la marque colorée à côté qui
   porte l'identité, pas le texte.

   Sous le graphique, un tableau équivalent est disponible pour les
   lecteurs d'écran — une courbe seule n'est lisible que par ceux qui la
   voient.
   ============================================================ */

const W = 320;
const H = 96;
const PAD = { top: 8, right: 8, bottom: 4, left: 26 };

const EX_LABEL = {
  notes: "Lecture de notes",
  rythme: "Lecture rythmique",
  intervalles: "Intervalles",
};

export default function Curve({ sessions, limit = 20 }) {
  const data = useMemo(() => {
    return sessions
      .filter((s) => s.total > 0 && !s.abandoned)
      .slice(-limit)
      .map((s, i) => ({
        i,
        pct: Math.round((s.correct / s.total) * 100),
        exercise: s.exercise,
        date: s.date,
      }));
  }, [sessions, limit]);

  const [hover, setHover] = useState(null);

  if (data.length < 3) {
    return (
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        La courbe apparaîtra après trois leçons.
      </p>
    );
  }

  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (p) => PAD.top + ih - (p / 100) * ih;

  const line = data.map((d, i) => `${i ? "L" : "M"}${x(d.i).toFixed(1)} ${y(d.pct).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data[data.length - 1].i).toFixed(1)} ${PAD.top + ih} L${x(0).toFixed(1)} ${PAD.top + ih} Z`;

  const last = data[data.length - 1];
  const mean = Math.round(data.reduce((a, d) => a + d.pct, 0) / data.length);
  const active = hover != null ? data[hover] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-2">
        <span className="display" style={{ fontSize: "1.5rem" }}>{last.pct}%</span>
        <span className="text-xs" style={{ color: "var(--ink-3)" }}>
          à la dernière leçon · {mean}% en moyenne sur {data.length}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}
        role="img" aria-label={`Précision des ${data.length} dernières leçons, de ${data[0].pct}% à ${last.pct}%`}
        onMouseLeave={() => setHover(null)}>
        {/* grille : discrète, jamais au premier plan */}
        {[0, 50, 100].map((g) => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)}
              stroke="var(--rule)" strokeWidth="1" />
            <text x={PAD.left - 6} y={y(g) + 3.5} textAnchor="end"
              style={{ fontSize: 8, fill: "var(--ink-3)", fontFamily: "PlexMono, monospace" }}>
              {g}
            </text>
          </g>
        ))}

        <path d={area} fill="var(--blue)" opacity="0.18" />
        <path d={line} fill="none" stroke="var(--blue)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d) => (
          <circle key={d.i} cx={x(d.i)} cy={y(d.pct)} r={d.i === last.i ? 4.5 : 2.6}
            fill={d.i === last.i ? "var(--blue)" : "var(--paper-2)"}
            stroke="var(--blue)" strokeWidth="2" />
        ))}

        {active && (
          <line x1={x(active.i)} x2={x(active.i)} y1={PAD.top} y2={PAD.top + ih}
            stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3" />
        )}

        {/* cibles de survol, plus larges que les points */}
        {data.map((d) => (
          <rect key={"h" + d.i} x={x(d.i) - iw / (data.length * 2) - 2} y={PAD.top}
            width={iw / data.length + 4} height={ih} fill="transparent"
            onMouseEnter={() => setHover(d.i)}>
            <title>{`${d.pct}% — ${EX_LABEL[d.exercise] || d.exercise}`}</title>
          </rect>
        ))}
      </svg>

      <div className="text-xs" style={{ color: "var(--ink-2)", minHeight: "1.2em" }}>
        {active
          ? `${active.pct}% · ${EX_LABEL[active.exercise] || active.exercise}`
          : "Survolez la courbe pour le détail"}
      </div>

      {/* équivalent textuel */}
      <table style={{
        position: "absolute", width: 1, height: 1, overflow: "hidden",
        clip: "rect(0 0 0 0)", whiteSpace: "nowrap",
      }}>
        <caption>Précision par leçon</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.i}>
              <th scope="row">Leçon {d.i + 1} — {EX_LABEL[d.exercise] || d.exercise}</th>
              <td>{d.pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
