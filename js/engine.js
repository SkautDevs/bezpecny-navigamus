// Pure game logic shared by the game (game.js) and the content checker (check.js).
// No DOM access here.

export const METERS = ['safety', 'trust', 'crew', 'energy'];
export const SLOTS = ['morning', 'afternoon', 'evening', 'night'];
export const DAYS = [1, 2, 3, 4];
export const START_VALUE = 50;
export const SLOT_SIZE = 3; // minimum cards per slot; required cards may exceed it
export const RESTART_RANGE = [30, 70]; // meters are pulled into this range when a day is retried
export const GOOD_RANGE = [25, 75]; // all meters inside -> "safe harbor" ending
export const NIGHT_REST = 15; // energy regained overnight, so a careful player doesn't burn out by design

export function newState() {
  return {
    day: 1,
    meters: Object.fromEntries(METERS.map((m) => [m, START_VALUE])),
    flags: [],
    seen: [], // ids of cards ever played (all days, all attempts)
    history: [], // { id, side, day } of the choices that count (retried days are dropped)
    checkpoint: null, // snapshot taken at the start of the current day
    perfect: true, // no fall and the intended choice on every card -> secret ending
  };
}

export function snapshot(state) {
  return { day: state.day, meters: { ...state.meters }, flags: [...state.flags], history: [...state.history] };
}

// Retrying after a fall; a fall also rules out the secret ending.
export function restoreCheckpoint(state) {
  const cp = state.checkpoint;
  state.perfect = false;
  state.day = cp.day;
  state.flags = [...cp.flags];
  state.history = [...(cp.history || [])];
  for (const m of METERS) {
    state.meters[m] = clamp(cp.meters[m], RESTART_RANGE[0], RESTART_RANGE[1]);
  }
}

export function startNextDay(state) {
  state.day++;
  state.meters.energy = clamp(state.meters.energy + NIGHT_REST, 0, 100);
}

export function isEligible(card, flags) {
  const has = (f) => flags.includes(f);
  return (card.requires || []).every(has) && !(card.excludes || []).some(has);
}

// Draws the cards for one slot: all required + all eligible chained cards,
// then random filler up to SLOT_SIZE. `rng` returns a float in [0, 1).
export function drawSlot(cards, day, slot, flags, usedToday, rng = Math.random) {
  const pool = cards.filter(
    (c) => c.day === day && c.slot === slot && !usedToday.includes(c.id) && isEligible(c, flags),
  );
  const fixed = pool.filter((c) => c.required || (c.requires && c.requires.length));
  const optional = shuffle(pool.filter((c) => !fixed.includes(c)), rng);
  const fill = optional.slice(0, Math.max(0, SLOT_SIZE - fixed.length));
  return shuffle([...fixed, ...fill], rng);
}

export function applyChoice(state, card, side) {
  const choice = card[side];
  if (isRisky(card, side)) state.perfect = false;
  for (const [meter, delta] of Object.entries(choice.effect || {})) {
    state.meters[meter] = clamp(state.meters[meter] + delta, 0, 100);
  }
  for (const f of choice.set || []) {
    if (!state.flags.includes(f)) state.flags.push(f);
  }
  state.history.push({ id: card.id, side, day: state.day });
}

// True when the card has an intended side and the player picked the other one.
export function isRisky(card, side) {
  return ['left', 'right'].includes(card.intended) && card.intended !== side;
}

// The choices that pushed `meter` furthest towards `edge` (0 or 100), strongest first.
// `onlyRisky` leaves out intended choices: appropriate steps cost crew or energy by design,
// and listing them as "what led to this" would teach the opposite of what the card meant.
export function topCauses(history, cards, meter, edge, { n = 2, onlyRisky = false } = {}) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return history
    .map((h) => {
      const card = byId.get(h.id);
      const delta = ((card?.[h.side].effect || {})[meter] || 0) * (edge === 0 ? -1 : 1);
      return { card, side: h.side, delta };
    })
    .filter((x) => x.card && x.delta > 0 && !(onlyRisky && !isRisky(x.card, x.side)))
    .sort((a, b) => b.delta - a.delta)
    .slice(0, n);
}

// Returns { meter, edge } for the first meter at 0 or 100, otherwise null.
export function checkFall(meters) {
  for (const m of METERS) {
    if (meters[m] <= 0) return { meter: m, edge: 0 };
    if (meters[m] >= 100) return { meter: m, edge: 100 };
  }
  return null;
}

export function goodEndingId(state) {
  const inside = METERS.every((m) => state.meters[m] >= GOOD_RANGE[0] && state.meters[m] <= GOOD_RANGE[1]);
  if (!inside) return 'scarred-harbor';
  return state.perfect ? 'helmsman' : 'safe-harbor';
}

export function fallEndingId(fall) {
  return `${fall.meter}-${fall.edge}`;
}

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

// Runs one full game with a choice policy; used by the checker to test balance.
// policy(card, state, rng) -> 'left' | 'right'. Returns { ending, falls, played }.
export function simulate(cards, policy, rng = Math.random, maxRetries = 20) {
  const state = newState();
  const falls = [];
  const played = new Set();
  let retries = 0;
  while (state.day <= 4) {
    state.checkpoint = snapshot(state);
    let fell = null;
    const usedToday = [];
    for (const slot of SLOTS) {
      if (fell) break;
      for (const card of drawSlot(cards, state.day, slot, state.flags, usedToday, rng)) {
        usedToday.push(card.id);
        played.add(card.id);
        applyChoice(state, card, policy(card, state, rng));
        fell = checkFall(state.meters);
        if (fell) break;
      }
    }
    if (fell) {
      falls.push(fallEndingId(fell));
      if (++retries > maxRetries) return { ending: null, falls, played };
      restoreCheckpoint(state);
      continue;
    }
    if (state.day < 4) startNextDay(state);
    else state.day++;
  }
  return { ending: goodEndingId(state), falls, played };
}
