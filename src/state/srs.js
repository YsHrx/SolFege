/* ============================================================
   RÉPÉTITION ESPACÉE

   Le tirage n'est plus uniforme. Chaque candidat reçoit un poids qui
   tient compte de trois choses :

   — la fragilité : un item raté une fois sur deux revient bien plus
     souvent qu'un item acquis ;
   — la nouveauté : ce qui n'a jamais été vu passe en priorité ;
   — l'oubli : au-delà de quelques jours, un item acquis redevient
     intéressant à revoir.

   En pratique, la composition d'une leçon tourne autour de 60 % de
   contenu courant, 25 % de rattrapage et 15 % de révision — mais ces
   proportions émergent des poids plutôt que d'être imposées, ce qui
   évite les paliers artificiels quand le sac est petit.
   ============================================================ */

const DAY = 86400000;

export function weightOf(item) {
  if (!item || !item.seen) return 2.2; // jamais vu : à découvrir

  let w = 1;

  // fragilité — c'est le terme dominant
  const rate = item.wrong / item.seen;
  w += rate * 3.2;

  // acquis : on l'espace, mais il revient avec le temps
  const rest = Math.min(5, item.box || 0);
  w *= 1 - rest * 0.13;

  const age = (Date.now() - (item.last || 0)) / DAY;
  if (age > 2) w += Math.min(1.2, (age - 2) * 0.25);

  /* Un seul poids NaN — un compteur non numérique dans une sauvegarde
     retouchée — suffirait à rendre NaN la somme des poids, et le tirage
     renverrait alors toujours le dernier candidat du sac : la leçon
     entière poserait la même question. */
  return Number.isFinite(w) ? Math.max(0.12, w) : 1;
}

/**
 * Construit un tireur pondéré sur un sac donné.
 *
 * @param pool   les candidats
 * @param keyOf  (candidat) => clé de mémoire, ex. "note:Fa5"
 * @param items  la mémoire enregistrée
 */
export function makePicker(pool, keyOf, items = {}) {
  return function pick(previous) {
    if (!pool.length) return null;
    if (pool.length === 1) return pool[0];

    const weights = pool.map((c) => {
      let w = weightOf(items[keyOf(c)]);
      // ne jamais reposer deux fois de suite la même question : l'élève
      // répondrait de mémoire immédiate, pas par lecture
      if (previous && keyOf(c) === keyOf(previous)) w *= 0.02;
      return w;
    });

    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  };
}

/** Tirage uniforme, en évitant la répétition immédiate. */
export function pickDifferent(pool, previous) {
  if (pool.length <= 1) return pool[0];
  let c, guard = 0;
  do {
    c = pool[Math.floor(Math.random() * pool.length)];
    guard += 1;
  } while (c === previous && guard < 20);
  return c;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Trois leurres plausibles autour de la bonne réponse. */
export function distractors(pool, answer, keyOf, count = 3) {
  const others = shuffle(pool.filter((c) => keyOf(c) !== keyOf(answer)));
  return shuffle([answer, ...others.slice(0, count)]);
}
