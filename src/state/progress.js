/* ============================================================
   PROGRESSION

   Schéma v5. Tout tient dans le `localStorage` ; rien ne sort de la
   machine.

   Changement majeur depuis la v4 : la « série » compte désormais les
   JOURS consécutifs de pratique. En v4 elle comptait les sessions
   parfaites d'affilée — un compteur qui, sur vingt questions, restait à
   zéro pour toujours, alors même qu'il occupait la place d'honneur sur
   l'accueil. Trois grandeurs différentes s'appelaient « série » ; il n'y
   en a plus qu'une, et le compteur de bonnes réponses en cours de leçon
   s'appelle maintenant « combo ».
   ============================================================ */

const KEY = "solfege_v5";
const LEGACY_KEY = "violin_trainer_state_v4";

export const MAX_FREEZES = 2;
export const LESSONS_PER_FREEZE = 10;
export const GOALS = [1, 3, 5];

export const xpForLevel = (l) => 100 + (l - 1) * 60;

/** Date locale au format AAAA-MM-JJ. Volontairement pas de UTC : la
    série doit suivre les journées de l'utilisateur, pas celles de
    Greenwich. */
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function daysBetween(a, b) {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  const ta = Date.UTC(ya, ma - 1, da);
  const tb = Date.UTC(yb, mb - 1, db);
  return Math.round((tb - ta) / 86400000);
}

export const DEFAULT = {
  v: 5,
  xp: 0,
  level: 1,
  totalLessons: 0,
  days: { last: null, streak: 0, best: 0, freezes: 0, credit: 0, log: {} },
  /** Mémoire par item, pour la répétition espacée. */
  items: {},
  /** Meilleur score par exercice × format × difficulté. */
  records: {},
  /** Avancement dans le chemin du mode Progression. */
  path: { done: {} },
  /** Les cinquante dernières leçons, pour la courbe de progression. */
  sessions: [],
  settings: {
    theme: "systeme",     // systeme | papier | ardoise
    notation: "fr",       // fr | en
    sound: true,
    hearts: true,         // les trois fausses notes
    goal: 3,              // leçons par jour
    bpm: 97,              // tempo de référence des exercices rythmiques
  },
};

const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const clean = (v, d) => Math.max(0, num(v, d));

/* La sauvegarde est relue à chaque ouverture. Si elle est partielle,
   tronquée ou issue d'une version antérieure, on la fusionne avec les
   valeurs par défaut plutôt que de lui faire confiance : un seul champ
   manquant suffirait à faire planter l'accueil. */
function normalise(saved) {
  if (!saved || typeof saved !== "object") return { ...DEFAULT };
  const s = saved.settings || {};
  const d = saved.days || {};
  return {
    v: 5,
    xp: clean(saved.xp, 0),
    level: Math.max(1, num(saved.level, 1)),
    totalLessons: clean(saved.totalLessons, 0),
    days: {
      last: typeof d.last === "string" ? d.last : null,
      streak: clean(d.streak, 0),
      best: clean(d.best, 0),
      freezes: Math.min(MAX_FREEZES, clean(d.freezes, 0)),
      credit: clean(d.credit, 0),
      log: d.log && typeof d.log === "object" ? d.log : {},
    },
    items: saved.items && typeof saved.items === "object" ? saved.items : {},
    records: saved.records && typeof saved.records === "object" ? saved.records : {},
    path: { done: (saved.path && saved.path.done) || {} },
    sessions: Array.isArray(saved.sessions) ? saved.sessions.slice(-50) : [],
    settings: {
      theme: ["systeme", "papier", "ardoise"].includes(s.theme) ? s.theme : "systeme",
      notation: s.notation === "en" ? "en" : "fr",
      sound: s.sound !== false,
      hearts: s.hearts !== false,
      goal: GOALS.includes(s.goal) ? s.goal : 3,
      bpm: Math.min(140, Math.max(50, num(s.bpm, 97))),
    },
  };
}

/* Reprise d'une sauvegarde v4. On conserve ce qui a du sens — l'XP, le
   niveau, le nombre de sessions, les statistiques par module converties
   en mémoire d'items — et on abandonne l'ancienne « série », qui ne
   mesurait pas la même chose. */
function migrateV4(old) {
  const p = { ...DEFAULT, days: { ...DEFAULT.days, log: {} }, items: {}, records: {} };
  p.xp = clean(old.xp, 0);
  p.level = Math.max(1, num(old.level, 1));
  p.totalLessons = clean(old.sessionsCompleted, 0);
  if (Array.isArray(old.history)) {
    p.sessions = old.history.slice(-50).map((h) => ({
      date: h.date,
      exercise: h.module === "rythme" ? "rythme" : h.module === "intervalles" ? "intervalles" : "notes",
      format: "serie",
      correct: clean(h.score, 0),
      total: clean(h.total, 0),
      mode: "entrainement",
    }));
    // les jours déjà pratiqués alimentent le calendrier, sans reconstituer
    // une série à laquelle l'utilisateur n'avait pas droit
    for (const s of p.sessions) {
      const k = (s.date || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) p.days.log[k] = (p.days.log[k] || 0) + 1;
    }
  }
  const st = old.settings || {};
  p.settings = {
    ...DEFAULT.settings,
    notation: st.notation === "en" ? "en" : "fr",
    sound: st.soundOn !== false,
  };
  return p;
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return normalise(JSON.parse(raw));
  } catch { /* sauvegarde illisible : on repart des valeurs par défaut */ }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return normalise(migrateV4(JSON.parse(legacy)));
  } catch { /* idem */ }
  return { ...DEFAULT };
}

export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* quota plein */ }
}

/** Relit une progression exportée. On la fait passer par la même
    normalisation que la sauvegarde locale : un fichier trafiqué ou issu
    d'une version antérieure ne doit pas pouvoir casser l'accueil. */
export function importProgress(json) {
  let parsed;
  try { parsed = JSON.parse(json); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const clean = parsed.v === 5 ? normalise(parsed) : normalise(migrateV4(parsed));
  saveProgress(clean);
  return clean;
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {}
  return { ...DEFAULT };
}

/* ============================================================
   ENREGISTREMENT D'UNE LEÇON
   ============================================================ */

/** Barème unique, quel que soit l'exercice. En v4, seule la lecture de
    notes renvoyait son combo : les deux autres modules plafonnaient à la
    moitié de l'XP à effort égal, sans que ce soit annoncé. */
export function xpFor({ correct, total, bestCombo = 0, abandoned = false }) {
  if (!total) return 0;
  const base = (correct / total) * (abandoned ? 20 : 40);
  const bonus = abandoned ? 0 : bestCombo * 2;
  return Math.round(base + bonus);
}

function bumpDays(days, today, gained) {
  const next = { ...days, log: { ...days.log } };
  next.log[today] = (next.log[today] || 0) + 1;

  if (days.last === today) return next; // déjà pratiqué aujourd'hui

  const gap = days.last ? daysBetween(days.last, today) : null;
  if (gap === null || gap <= 0) {
    next.streak = Math.max(1, days.streak);
  } else if (gap === 1) {
    next.streak = days.streak + 1;
  } else {
    // Un gel couvre une journée manquée. C'est ce qui évite d'abandonner
    // après un seul jour sauté — l'effet de falaise des séries strictes.
    const missed = gap - 1;
    if (next.freezes >= missed) {
      next.freezes -= missed;
      next.streak = days.streak + 1;
    } else {
      next.streak = 1;
    }
  }
  next.last = today;
  next.best = Math.max(next.best, next.streak);

  // un gel gagné toutes les dix leçons, deux en réserve au maximum
  next.credit = (next.credit || 0) + gained;
  while (next.credit >= LESSONS_PER_FREEZE && next.freezes < MAX_FREEZES) {
    next.credit -= LESSONS_PER_FREEZE;
    next.freezes += 1;
  }
  return next;
}

/**
 * Applique le résultat d'une leçon et renvoie la nouvelle progression.
 * `result` : { exercise, format, difficulty, mode, correct, total,
 *              bestCombo, abandoned, ms, score, itemResults, lessonId }
 */
export function applyLesson(prev, result) {
  const today = dayKey();
  const gained = xpFor(result);

  let xp = prev.xp + gained;
  let level = prev.level;
  while (xp >= xpForLevel(level)) {
    xp -= xpForLevel(level);
    level += 1;
  }

  // mémoire par item : c'est elle qui nourrit la répétition espacée
  const items = { ...prev.items };
  for (const r of result.itemResults || []) {
    const cur = items[r.key] || { seen: 0, wrong: 0, box: 0, last: 0 };
    items[r.key] = {
      seen: cur.seen + 1,
      wrong: cur.wrong + (r.ok ? 0 : 1),
      box: r.ok ? Math.min(5, cur.box + 1) : 0,
      last: Date.now(),
    };
  }

  // records : seuls les formats chronométrés et la mort subite en ont un
  const records = { ...prev.records };
  if (result.recordKey && typeof result.score === "number") {
    records[result.recordKey] = Math.max(records[result.recordKey] || 0, result.score);
  }

  const counts = !result.abandoned && result.total > 0;
  const days = counts ? bumpDays(prev.days, today, 1) : prev.days;

  // Une leçon perdue sur les trois fausses notes ne débloque pas la
  // suivante : elle est à refaire. La journée de pratique, elle, compte —
  // s'entraîner et échouer reste s'entraîner.
  const path = { done: { ...prev.path.done } };
  if (counts && !result.failed && result.mode === "progression" && result.lessonId) {
    const perfect = result.correct === result.total;
    const before = path.done[result.lessonId];
    // une leçon déjà en or le reste
    path.done[result.lessonId] = before === "or" || perfect ? "or" : "fait";
  }

  // Niveau légendaire : une unité déjà acquise, refaite sans la moindre
  // erreur et au chronomètre, passe entièrement en or. C'est ce qui donne
  // une raison de revenir sur ce qu'on sait déjà.
  if (
    counts && !result.failed && !result.abandoned
    && result.legendaryLessons && result.correct === result.total && result.total > 0
  ) {
    for (const id of result.legendaryLessons) path.done[id] = "or";
  }

  return {
    ...prev,
    xp, level, days, items, records, path,
    totalLessons: prev.totalLessons + (counts ? 1 : 0),
    sessions: [
      ...prev.sessions.slice(-49),
      {
        date: new Date().toISOString(),
        exercise: result.exercise,
        format: result.format,
        difficulty: result.difficulty,
        mode: result.mode,
        correct: result.correct,
        total: result.total,
        ms: result.ms || 0,
        abandoned: !!result.abandoned,
      },
    ],
  };
}

/* ============================================================
   LECTURES DÉRIVÉES
   ============================================================ */

export function lessonsToday(p) {
  return p.days.log[dayKey()] || 0;
}

/** La série est-elle encore vivante aujourd'hui ? Elle ne se rompt pas
    tant que la journée d'après n'est pas passée. */
export function streakAlive(p) {
  if (!p.days.last) return false;
  const gap = daysBetween(p.days.last, dayKey());
  return gap <= 1 || gap - 1 <= p.days.freezes;
}

export function accuracyByExercise(p) {
  const out = {};
  for (const s of p.sessions) {
    if (!s.total) continue;
    const e = (out[s.exercise] = out[s.exercise] || { correct: 0, total: 0, lessons: 0 });
    e.correct += s.correct;
    e.total += s.total;
    e.lessons += 1;
  }
  return out;
}

/** Les items les plus fragiles, pour la leçon « points faibles ». */
export function weakItems(p, prefix, limit = 8) {
  return Object.entries(p.items)
    .filter(([k, v]) => k.startsWith(prefix) && v.seen >= 2 && v.wrong > 0)
    .map(([key, v]) => ({ key, ...v, rate: v.wrong / v.seen }))
    .sort((a, b) => b.rate - a.rate || b.wrong - a.wrong)
    .slice(0, limit);
}

export function recordKey(exercise, format, difficulty) {
  return `${exercise}|${format}|${difficulty}`;
}
