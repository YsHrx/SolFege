import React, { useEffect, useState } from "react";
import { Btn, Card, CountUp, NoteRain } from "../ui/kit.jsx";
import { Mascot } from "../ui/Mascot.jsx";
import { Staff } from "../ui/Glyphs.jsx";
import { EXERCISES } from "./Lesson.jsx";
import { FORMATS } from "../lesson/engine.js";
import { noteByLabel, staffPosition } from "../music/notes.js";
import { NOTE_PREFIXES } from "../state/progress.js";

/* ============================================================
   FIN DE LEÇON

   En trois temps plutôt qu'un pourcentage dans un anneau : l'annonce,
   les chiffres qui s'incrémentent, puis la suite. Le seul fait de faire
   compter les totaux change la sensation de l'écran.
   ============================================================ */

function verdict(pct, abandoned, format, score, failed) {
  if (abandoned) return { title: "Leçon interrompue", mood: "repos" };
  if (failed) return { title: "Trois fausses notes", mood: "rate" };
  if (format === "mort_subite") {
    return score >= 20
      ? { title: `${score} sans faute !`, mood: "ravi" }
      : score >= 8
        ? { title: `${score} d'affilée`, mood: "content" }
        : { title: "La première erreur arrête tout", mood: "rate" };
  }
  if (format === "chrono") {
    return score >= 25
      ? { title: `${score} bonnes réponses !`, mood: "ravi" }
      : { title: `${score} bonnes réponses`, mood: score >= 10 ? "content" : "repos" };
  }
  if (pct === 100) return { title: "Sans faute !", mood: "ravi" };
  if (pct >= 80) return { title: "Bien joué", mood: "content" };
  if (pct >= 50) return { title: "Ça progresse", mood: "repos" };
  return { title: "À retravailler", mood: "rate" };
}

/** Les notes manquées, sur une mini-portée. L'information la plus utile
    de l'écran : un pourcentage ne dit pas SUR QUOI on a buté. */
function Misses({ misses }) {
  /* Les clés portent leur famille en préfixe — lecture, écriture,
     oreille. Toutes désignent la même note sur la portée : on retire le
     préfixe, on écarte les doublons, et l'altération éventuelle (« Fa5# »)
     retombe sur la note naturelle plutôt que de disparaître. */
  const notes = [...new Set(
    misses
      .filter((k) => NOTE_PREFIXES.some((pre) => k.startsWith(pre)))
      .map((k) => k.slice(k.indexOf(":") + 1).replace(/[#b]$/, ""))
  )].map(noteByLabel).filter(Boolean);
  if (!notes.length) return null;
  return (
    <Card sunk className="w-full p-3 flex flex-col gap-2">
      <span className="label">À revoir</span>
      <Staff
        spacing={13}
        slots={Math.min(6, notes.length)}
        notes={notes.slice(0, 6).map((n) => ({ position: staffPosition(n), state: "bad" }))}
        ariaLabel={"Notes manquées : " + notes.map((n) => n.label).join(", ")}
      />
      <div className="flex flex-wrap gap-1.5 justify-center">
        {notes.slice(0, 6).map((n, i) => (
          <span key={i} className="chip" style={{ color: "var(--brick)" }}>{n.label}</span>
        ))}
      </div>
    </Card>
  );
}

export default function Results({ result, onHome, onRetry, onNext }) {
  const [step, setStep] = useState(0);
  const pct = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const v = verdict(pct, result.abandoned, result.format, result.score, result.failed);
  const celebrate =
    !result.abandoned && !result.failed && (pct === 100 || result.newRecord || result.goldWon);

  useEffect(() => {
    const a = setTimeout(() => setStep(1), 620);
    const b = setTimeout(() => setStep(2), 1180);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  const seconds = Math.round((result.ms || 0) / 1000);
  const perMinute = seconds > 0 ? Math.round((result.correct / seconds) * 60) : 0;

  return (
    <div className="relative z-10 flex flex-col items-center gap-4 w-full max-w-lg mx-auto px-4 pt-10 pb-10 text-center">
      {celebrate && <NoteRain />}

      <div className="anim-rise">
        <Mascot mood={v.mood} size={124} />
      </div>
      <h2 style={{ fontSize: "1.9rem" }} className="anim-rise">{v.title}</h2>

      {result.failed && (
        <p className="text-sm" style={{ color: "var(--ink-2)", maxWidth: "22rem" }}>
          La leçon s'arrête là et reste à refaire. Vous pouvez couper les trois
          fausses notes dans les réglages pour vous entraîner sans limite.
        </p>
      )}

      {result.goldWon && (
        <span className="chip anim-pop" style={{ color: "var(--mustard)" }}>
          unité passée en or
        </span>
      )}

      {result.newRecord && (
        <span className="chip anim-pop" style={{ color: "var(--mustard)" }}>
          nouveau record
        </span>
      )}

      {step >= 1 && (
        <div className="grid grid-cols-3 gap-2 w-full anim-rise">
          <Card className="p-3">
            <div className="display" style={{ fontSize: "1.6rem", color: "var(--mustard)" }}>
              +<CountUp to={result.xpGained} />
            </div>
            <div className="label">XP</div>
          </Card>
          <Card className="p-3">
            <div className="display" style={{ fontSize: "1.6rem" }}>
              <CountUp to={pct} suffix="%" delay={120} />
            </div>
            <div className="label">précision</div>
          </Card>
          <Card className="p-3">
            <div className="display" style={{ fontSize: "1.6rem" }}>
              <CountUp to={result.bestCombo || 0} delay={240} />
            </div>
            <div className="label">combo max</div>
          </Card>
        </div>
      )}

      {step >= 1 && (
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {result.total > 0
            ? `${result.correct} bonnes réponses sur ${result.total}`
            : "Aucune réponse enregistrée"}
          {seconds > 0 && ` · ${seconds} s`}
          {result.format !== "serie" && perMinute > 0 && ` · ${perMinute} par minute`}
        </p>
      )}

      {step >= 2 && result.misses && result.misses.length > 0 && (
        <div className="anim-rise w-full"><Misses misses={result.misses} /></div>
      )}

      {step >= 2 && result.streakBumped && (
        <Card className="w-full p-3 anim-rise flex items-center justify-center gap-3">
          <span className="display" style={{ fontSize: "1.7rem", color: "var(--mustard)" }}>
            {result.streak}
          </span>
          <span className="text-sm" style={{ color: "var(--ink-2)" }}>
            jour{result.streak > 1 ? "s" : ""} d'affilée
          </span>
        </Card>
      )}

      {step >= 2 && (
        <div className="flex gap-2.5 w-full mt-2 anim-rise">
          <Btn block onClick={onHome}>Accueil</Btn>
          {onNext
            ? <Btn block tone="moss" onClick={onNext}>Continuer</Btn>
            : <Btn block tone="moss" onClick={onRetry}>Recommencer</Btn>}
        </div>
      )}

      {step >= 2 && onNext && (
        <button type="button" onClick={onRetry}
          className="text-sm underline" style={{ color: "var(--ink-3)", background: "none", border: "none" }}>
          Refaire cette leçon
        </button>
      )}

      <span className="label mt-2">
        {EXERCISES[result.exercise]?.title} · {FORMATS[result.format]?.label}
      </span>
    </div>
  );
}
