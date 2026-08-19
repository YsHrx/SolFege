import { useCallback, useEffect, useRef, useState } from "react";

/* ============================================================
   MOTEUR DE LEÇON

   Un seul moteur pour tous les exercices. L'exercice fournit deux
   choses — comment tirer une question, et si une réponse est juste — le
   moteur s'occupe du reste : enchaînement, combo, cœurs, chronomètres,
   file de reprise, conditions de fin.

   TROIS FORMATS DE PARTIE

   — « serie »       : un nombre de questions fixe. Les items ratés sont
                       remis dans une file et rejoués avant la fin, ce
                       qui évite de terminer sur une erreur non corrigée.
   — « chrono »      : un temps global. On répond au maximum de
                       questions ; le score est le nombre de bonnes
                       réponses.
   — « mort_subite » : sans fin, s'arrête à la première erreur. Le temps
                       accordé par question se resserre à chaque
                       réussite : le score finit par être limité par la
                       vitesse de lecture, pas par la patience.

   RÉGIMES DE CHRONOMÈTRE par question, indépendants du format :
   « libre » (aucune limite), « fixe », « adaptatif » (se resserre sur
   les réussites, s'élargit sur les erreurs).
   ============================================================ */

export const FORMATS = {
  serie: { id: "serie", label: "Série", hint: "Un nombre de questions fixe" },
  chrono: { id: "chrono", label: "Contre-la-montre", hint: "Un maximum de bonnes réponses dans le temps imparti" },
  mort_subite: { id: "mort_subite", label: "Mort subite", hint: "Sans fin — la première erreur arrête tout" },
};

export const MAX_HEARTS = 3;
const TICK_MS = 80;

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * @param opts.format        serie | chrono | mort_subite
 * @param opts.total         nombre de questions (format « serie »)
 * @param opts.seconds       durée (format « chrono »)
 * @param opts.hearts        activer les trois fausses notes
 * @param opts.timer         { mode, start, min, max, step }
 * @param opts.draw          (précédente) => question, avec une clé `key`
 * @param opts.onFinish      (résultat) => void
 * @param opts.feedbackMs    { ok, ko } durée d'affichage de la correction
 */
export function useLesson(opts) {
  const {
    format = "serie",
    total = 10,
    seconds = 60,
    hearts: heartsOn = true,
    timer = { mode: "libre" },
    draw,
    onFinish,
    feedbackMs = { ok: 340, ko: 950 },
  } = opts;

  const [question, setQuestion] = useState(() => draw(null));
  const [phase, setPhase] = useState("ask");        // ask | feedback | done
  const [answered, setAnswered] = useState(null);   // ce qui a été répondu
  const [wasCorrect, setWasCorrect] = useState(null);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [limit, setLimit] = useState(
    timer.mode === "libre" ? null : timer.start ?? 6
  );
  const [left, setLeft] = useState(timer.start ?? 6);
  const [globalLeft, setGlobalLeft] = useState(seconds);

  // Les refs portent la vérité pendant les minuteurs : les fermetures
  // d'un `setInterval` ne verraient pas les états mis à jour.
  const S = useRef({
    correct: 0, wrong: 0, combo: 0, bestCombo: 0, index: 0,
    hearts: MAX_HEARTS, done: false, results: [], retry: [],
    startedAt: now(), limit: timer.start ?? 6, question: null,
  });
  S.current.question = question;

  const tickRef = useRef(null);
  const advanceRef = useRef(null);
  const globalRef = useRef(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  // L'exercice redéfinit ces fonctions à chaque rendu ; on les lit par ref
  // pour que les minuteurs n'aient pas à être reconstruits pour autant.
  const fns = useRef({ draw, isCorrect: opts.isCorrect, itemResults: opts.itemResults });
  fns.current = { draw, isCorrect: opts.isCorrect, itemResults: opts.itemResults };

  const clearTimers = () => {
    clearInterval(tickRef.current);
    clearTimeout(advanceRef.current);
    clearInterval(globalRef.current);
  };

  /* `onFinish` est lu par ref. S'il changeait d'identité en cours de
     partie, `finish` changerait avec lui — et l'effet du contre-la-montre,
     qui en dépend, redémarrerait son compte à rebours depuis le début : le
     temps imparti ne s'écoulerait jamais. */
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const finish = useCallback((abandoned = false, failed = false) => {
    if (S.current.done) return;
    S.current.done = true;
    clearTimers();
    const s = S.current;
    const asked = s.correct + s.wrong;
    finishRef.current({
      correct: s.correct,
      total: asked,
      bestCombo: s.bestCombo,
      abandoned,
      // « échouée » n'est pas « abandonnée » : les réponses comptent et la
      // journée de pratique compte, mais la leçon reste à refaire.
      failed,
      ms: Math.round(now() - s.startedAt),
      itemResults: s.results,
      // le score mis en avant dépend du format
      score:
        format === "chrono" ? s.correct
          : format === "mort_subite" ? s.correct
            : asked ? Math.round((s.correct / asked) * 100) : 0,
    });
  }, [format]);

  /* ---------- chronomètre global (contre-la-montre) ---------- */
  useEffect(() => {
    if (format !== "chrono") return undefined;
    const end = now() + seconds * 1000;
    globalRef.current = setInterval(() => {
      const remaining = (end - now()) / 1000;
      if (remaining <= 0) {
        clearInterval(globalRef.current);
        setGlobalLeft(0);
        finish(false);
      } else {
        setGlobalLeft(remaining);
      }
    }, TICK_MS);
    return () => clearInterval(globalRef.current);
  }, [format, seconds, finish]);

  /* ---------- chronomètre par question ---------- */
  useEffect(() => {
    clearInterval(tickRef.current);
    if (phase !== "ask" || limit == null || S.current.done) return undefined;
    setLeft(limit);
    const start = now();
    tickRef.current = setInterval(() => {
      const remaining = limit - (now() - start) / 1000;
      if (remaining <= 0) {
        clearInterval(tickRef.current);
        submit(null); // temps écoulé : compté comme une erreur
      } else {
        setLeft(remaining);
      }
    }, TICK_MS);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase, limit]);

  useEffect(() => () => clearTimers(), []);

  /* ---------- avancer ---------- */
  const advance = useCallback(() => {
    const s = S.current;
    if (s.done) return;

    if (format === "serie") {
      const asked = s.index + 1;
      if (asked >= total) {
        // La file de reprise : les items ratés reviennent avant de clore
        // la leçon. On ne termine pas sur une erreur restée sans réponse.
        if (s.retry.length) {
          const q = s.retry.shift();
          s.index = asked;
          setIndex(asked);
          setQuestion(q);
          setPhase("ask");
          setAnswered(null);
          setWasCorrect(null);
          return;
        }
        finish(false);
        return;
      }
      s.index = asked;
      setIndex(asked);
    } else {
      s.index += 1;
      setIndex(s.index);
    }

    setQuestion(fns.current.draw(s.question));
    setPhase("ask");
    setAnswered(null);
    setWasCorrect(null);
  }, [finish, format, total]);

  /* ---------- répondre ---------- */
  const submit = useCallback((value) => {
    const s = S.current;
    if (s.done || phaseRef.current !== "ask") return;
    clearInterval(tickRef.current);

    const q = s.question;
    const ok = value != null && fns.current.isCorrect(q, value);

    if (ok) {
      s.correct += 1;
      s.combo += 1;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      setCorrect(s.correct);
      setCombo(s.combo);
    } else {
      s.wrong += 1;
      s.combo = 0;
      setCombo(0);
      // Reprise, mais pas indéfiniment : au bout de deux passages ratés
      // l'item sort de la file, sinon une leçon sans cœurs ne se
      // terminerait jamais.
      if (format === "serie") {
        q.__retries = (q.__retries || 0) + 1;
        if (q.__retries <= 2) s.retry.push(q);
      }
      if (heartsOn && format === "serie") {
        s.hearts -= 1;
        setHearts(s.hearts);
      }
    }
    /* Une question peut porter sur plusieurs items — une mesure, c'est
       quatre notes. Sans ce détour, la mémoire n'enregistrerait qu'une
       clé composite qui ne se représente jamais, et la répétition
       espacée resterait lettre morte pour tout ce qui se pratique par
       groupes. */
    const detail = fns.current.itemResults && fns.current.itemResults(q, value);
    if (detail && detail.length) s.results.push(...detail);
    else s.results.push({ key: q.key, ok });

    // chronomètre adaptatif
    if (timer.mode === "adaptatif" || format === "mort_subite") {
      const min = timer.min ?? 2;
      const max = timer.max ?? 9;
      const step = timer.step ?? 0.25;
      s.limit = ok
        ? Math.max(min, s.limit - step)
        : Math.min(max, s.limit + step * 2);
      setLimit(s.limit);
    }

    setAnswered(value);
    setWasCorrect(ok);
    setPhase("feedback");

    // mort subite : la première erreur arrête tout
    if (!ok && format === "mort_subite") {
      advanceRef.current = setTimeout(() => finish(false), 1100);
      return;
    }
    // plus de fausses notes disponibles : la leçon s'interrompt, à refaire
    if (heartsOn && format === "serie" && s.hearts <= 0) {
      advanceRef.current = setTimeout(() => finish(false, true), 1100);
      return;
    }

    advanceRef.current = setTimeout(advance, ok ? feedbackMs.ok : feedbackMs.ko);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advance, finish, format, heartsOn, timer.mode]);

  const quit = useCallback(() => finish(true), [finish]);

  /* Combien de questions au total ? En série c'est connu d'avance, file
     de reprise comprise ; sinon il n'y a pas de fin annoncée. */
  const plannedTotal = format === "serie" ? total + S.current.retry.length : null;

  return {
    question, phase, index, correct, combo, hearts, answered, wasCorrect,
    // chronomètres
    limit, left, globalLeft,
    progress: plannedTotal ? Math.min(1, index / plannedTotal) : null,
    plannedTotal,
    retryCount: S.current.retry.length,
    // actions
    submit, quit,
    isAsking: phase === "ask",
  };
}
