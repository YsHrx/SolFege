import React, { useState } from "react";
import { Btn, Card, Segmented } from "../ui/kit.jsx";
import { GOALS, dayKey } from "../state/progress.js";

/* ============================================================
   RÉGLAGES
   ============================================================ */

function Row({ title, hint, children }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{title}</div>
        {hint && <div className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{hint}</div>}
      </div>
      <div style={{ flex: "0 0 auto" }}>{children}</div>
    </Card>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 58, height: 32, borderRadius: 99, padding: 3,
        border: "2.5px solid var(--edge)",
        background: on ? "var(--moss)" : "var(--sunk)",
        boxShadow: "0 3px 0 var(--edge)",
        display: "flex", justifyContent: on ? "flex-end" : "flex-start",
        transition: "background 160ms",
      }}>
      <span style={{
        width: 21, height: 21, borderRadius: "50%",
        background: "var(--paper)", border: "2.5px solid var(--edge)",
        transition: "transform 160ms cubic-bezier(.34,1.56,.64,1)",
      }} />
    </button>
  );
}

/** Le mois en cours, un carré par jour pratiqué. */
function Calendar({ log }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const first = (new Date(year, month, 1).getDay() + 6) % 7; // lundi en tête
  const today = dayKey();

  return (
    <Card className="p-4 flex flex-col gap-2">
      <span className="label">
        {now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
      </span>
      <div className="grid grid-cols-7 gap-1">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="label text-center" style={{ fontSize: "0.6rem" }}>{d}</span>
        ))}
        {Array.from({ length: first }).map((_, i) => <span key={"e" + i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const k = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
          const n = log[k] || 0;
          const isToday = k === today;
          return (
            <span key={k} title={`${i + 1} : ${n} leçon${n > 1 ? "s" : ""}`}
              style={{
                aspectRatio: "1", borderRadius: 6,
                border: `2px solid ${isToday ? "var(--edge)" : "transparent"}`,
                background: n === 0 ? "var(--sunk)"
                  : n === 1 ? "var(--moss)" : "var(--mustard)",
                opacity: n === 0 ? 0.55 : 1,
                display: "grid", placeItems: "center",
                fontSize: "0.6rem", fontFamily: "PlexMono, monospace",
                color: n === 0 ? "var(--ink-3)" : "var(--on-color)",
              }}>
              {i + 1}
            </span>
          );
        })}
      </div>
    </Card>
  );
}

export default function Settings({ progress, onChange, onReset, onBack }) {
  const s = progress.settings;
  const [confirming, setConfirming] = useState(false);
  const set = (patch) => onChange({ ...s, ...patch });

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solfege-progression-${dayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-lg mx-auto px-4 pb-16">
      <button type="button" onClick={onBack} className="self-start text-sm"
        style={{ color: "var(--blue)", background: "none", border: "none", padding: 0 }}>
        ← Retour
      </button>

      <h2 style={{ fontSize: "1.7rem" }}>Réglages</h2>

      <span className="label mt-2">Apparence</span>
      <Row title="Thème" hint="Papier, ardoise, ou celui du système">
        <Segmented value={s.theme} onChange={(v) => set({ theme: v })} ariaLabel="Thème"
          options={[
            { value: "papier", label: "Papier" },
            { value: "ardoise", label: "Ardoise" },
            { value: "systeme", label: "Auto" },
          ]} />
      </Row>
      <Row title="Notation" hint="Les noms de notes affichés">
        <Segmented value={s.notation} onChange={(v) => set({ notation: v })} ariaLabel="Notation"
          options={[{ value: "fr", label: "Do Ré Mi" }, { value: "en", label: "C D E" }]} />
      </Row>

      <span className="label mt-2">Leçons</span>
      <Row title="Son" hint="Le violon et le métronome">
        <Toggle on={s.sound} onChange={(v) => set({ sound: v })} label="Son" />
      </Row>
      <Row title="Trois fausses notes"
        hint="La leçon s'arrête au bout de trois erreurs. Désactivé : pratique libre.">
        <Toggle on={s.hearts} onChange={(v) => set({ hearts: v })} label="Trois fausses notes" />
      </Row>
      <Row title="Objectif du jour" hint="Le nombre de leçons visé chaque jour">
        <Segmented value={s.goal} onChange={(v) => set({ goal: v })} ariaLabel="Objectif du jour"
          options={GOALS.map((g) => ({ value: g, label: String(g) }))} />
      </Row>

      <span className="label mt-2">Pratique</span>
      <Calendar log={progress.days.log} />

      <span className="label mt-2">Données</span>
      <Card flat className="p-4">
        <p className="text-xs" style={{ color: "var(--ink-2)" }}>
          Tout est enregistré dans ce navigateur seulement — rien n'est envoyé
          nulle part, et la progression ne suit pas d'un appareil à l'autre.
          L'export permet de la transporter.
        </p>
      </Card>
      <div className="flex gap-2">
        <Btn block onClick={exportJson}>Exporter</Btn>
        <Btn block tone="brick" onClick={() => setConfirming(true)}>Réinitialiser</Btn>
      </div>

      {confirming && (
        <Card className="p-4 flex flex-col gap-3 anim-rise">
          <p className="text-sm">
            Effacer toute la progression ? Le niveau, la série, le chemin et les
            records seront perdus. C'est irréversible.
          </p>
          <div className="flex gap-2">
            <Btn block onClick={() => setConfirming(false)}>Annuler</Btn>
            <Btn block tone="brick" onClick={() => { setConfirming(false); onReset(); }}>
              Tout effacer
            </Btn>
          </div>
        </Card>
      )}
    </div>
  );
}
