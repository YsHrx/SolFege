import React from "react";
import { Staff, KEY_SIGNATURES } from "../ui/Glyphs.jsx";
import { Card } from "../ui/kit.jsx";
import { distractors, makePicker } from "../state/srs.js";

/* ============================================================
   ARMURES ET TONALITÉS

   Une armure s'affiche, on nomme la tonalité majeure. C'est le
   prolongement naturel des altérations : savoir lire un dièse ne sert
   pas à grand-chose si l'on ne sait pas ce que deux dièses en tête de
   portée veulent dire.

   Les relatives mineures sont indiquées à la correction — elles
   partagent l'armure, et l'ignorer est une confusion classique.
   ============================================================ */

export const keySigKeyOf = (k) => `armure:${k.count}${k.type}`;

export function makeKeySigDraw(difficulty, items) {
  // on ouvre progressivement le cycle des quintes
  const limit = difficulty === "debutant" ? 3 : difficulty === "intermediaire" ? 6 : 11;
  const pool = KEY_SIGNATURES.slice(0, limit);
  const pick = makePicker(pool, keySigKeyOf, items);
  return (prev) => {
    const key = pick(prev ? prev.sig : null);
    return { key: keySigKeyOf(key), sig: key, choices: distractors(pool, key, keySigKeyOf, 3) };
  };
}

export const keySigIsCorrect = (q, v) => v === q.sig.major;

export function KeySignatureView({ lesson }) {
  const { question, phase, wasCorrect, answered, submit, isAsking } = lesson;
  const sig = question.sig;
  const shake = phase === "feedback" && !wasCorrect;

  return (
    <>
      <Card sunk className={`w-full py-4 px-2 ${shake ? "anim-shake" : ""}`}>
        <Staff
          spacing={18}
          slots={1}
          notes={[]}
          keySignature={sig.count > 0 ? { count: sig.count, type: sig.type } : null}
          ariaLabel={
            sig.count === 0
              ? "Portée sans armure"
              : `Armure de ${sig.count} ${sig.type === "#" ? "dièse" : "bémol"}${sig.count > 1 ? "s" : ""}`
          }
        />
      </Card>

      <p className="label text-center">Quelle tonalité majeure ?</p>

      <div className="grid grid-cols-1 gap-2 w-full">
        {question.choices.map((c) => {
          const isWrong = phase === "feedback" && !wasCorrect && answered === c.major;
          const isRight = phase === "feedback" && c.major === sig.major;
          const bg = isWrong ? "var(--brick)" : isRight ? "var(--moss)" : "var(--paper-2)";
          const fg = isWrong || isRight ? "var(--on-color)" : "var(--ink)";
          return (
            <button key={keySigKeyOf(c)} type="button" className="btn"
              onClick={() => submit(c.major)} disabled={!isAsking}
              style={{
                justifyContent: "space-between", padding: "0.8rem 1.1rem",
                background: bg, color: fg, fontSize: "0.95rem",
              }}>
              {c.major}
              {/* Le nombre d'altérations n'apparaît QU'À la correction :
                  l'afficher sur les boutons reviendrait à donner la
                  réponse — il suffirait de compter les dièses à l'écran. */}
              {phase === "feedback" && (
                <span className="mono" style={{ fontSize: 11, opacity: 0.6 }}>
                  {c.count === 0 ? "—" : `${c.count} ${c.type === "#" ? "♯" : "♭"}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {phase === "feedback" && (
        <p className="text-sm text-center" style={{ color: "var(--ink-2)" }}>
          {sig.major} — relative mineure : {sig.minor}
        </p>
      )}
    </>
  );
}
