// Game UI: screens, swipe handling, persistence. Rules live in engine.js.
import {
  METERS, SLOTS, GOOD_RANGE, newState, snapshot, restoreCheckpoint, drawSlot,
  applyChoice, checkFall, fallEndingId, goodEndingId, startNextDay, isRisky, topCauses,
} from './engine.js';

const DAY_NAMES = { 1: 'Čtvrtek', 2: 'Pátek', 3: 'Sobota', 4: 'Neděle' };
const DAY_NAMES_ACC = { 1: 'čtvrtek', 2: 'pátek', 3: 'sobotu', 4: 'neděli' };
const SLOT_NAMES = { morning: 'Ráno', afternoon: 'Odpoledne', evening: 'Večer', night: 'Noc' };
const SLOT_ICONS = { morning: '🌅', afternoon: '☀️', evening: '🌇', night: '🌙' };
const METER_ICONS = { safety: '🛡️', trust: '🤝', crew: '👥', energy: '🔋' };
const METER_NAMES = { safety: 'Bezpečí', trust: 'Důvěra', crew: 'Parta', energy: 'Síly' };
const SWIPE_THRESHOLD = 90; // px of horizontal drag that commits a choice
const STORAGE_STATE = 'sfh-state';
const STORAGE_ENDINGS = 'sfh-endings';
const STORAGE_SEAL = 'sfh-seal';

const $ = (id) => document.getElementById(id);

let cards = [];
let endings = [];
let state = null;
// Per-day runtime, rebuilt whenever a day (re)starts.
let slotIndex = 0;
let queue = [];
let current = null;
let usedToday = [];
let dayLog = [];
let busy = false;
// Sides are randomly mirrored per card so players can't learn "right is always the good one".
let mirrored = false;
const actual = (shownSide) => (mirrored ? (shownSide === 'left' ? 'right' : 'left') : shownSide);

// ---------- storage (best effort: private mode may throw) ----------

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* progress just won't survive a reload */
  }
}

function markEndingFound(id) {
  const found = load(STORAGE_ENDINGS, []);
  if (!found.includes(id)) save(STORAGE_ENDINGS, [...found, id]);
}

function foundText() {
  const found = load(STORAGE_ENDINGS, []);
  return found.length ? `Objevené konce: ${found.length} / ${endings.length}` : '';
}

// ---------- screens ----------

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${name}`;
}

function showIntro() {
  const saved = load(STORAGE_STATE, null);
  const btn = $('btn-continue');
  btn.hidden = !saved;
  if (saved) {
    btn.textContent = `Pokračovat (${DAY_NAMES_ACC[saved.checkpoint.day]})`;
    $('btn-new').textContent = 'Začít znovu';
    $('btn-new').classList.remove('primary');
  }
  $('found-intro').textContent = foundText();
  show('intro');
}

// ---------- meters ----------

function renderMeters() {
  const box = $('meters');
  if (!box.children.length) {
    for (const m of METERS) {
      const el = document.createElement('div');
      el.className = 'meter';
      el.dataset.meter = m;
      el.title = METER_NAMES[m];
      el.innerHTML = `<span class="dot"></span><span class="gauge"><span class="fill"></span><span class="icon">${METER_ICONS[m]}</span></span>`;
      box.append(el);
    }
  }
  for (const m of METERS) {
    const el = box.querySelector(`[data-meter="${m}"]`);
    const v = state.meters[m];
    el.querySelector('.fill').style.height = `${v}%`;
    el.classList.toggle('danger', v <= 15 || v >= 85);
  }
}

// Shows which meters a choice touches (dot size = magnitude), never the direction.
function previewEffect(effect) {
  for (const m of METERS) {
    const dot = $('meters').querySelector(`[data-meter="${m}"] .dot`);
    const d = Math.abs((effect && effect[m]) || 0);
    dot.className = 'dot' + (d === 0 ? '' : d <= 10 ? ' s' : d <= 20 ? ' m' : ' l');
  }
}

// ---------- day flow ----------

function startDay() {
  state.checkpoint = snapshot(state);
  save(STORAGE_STATE, state);
  slotIndex = 0;
  usedToday = [];
  dayLog = [];
  queue = drawSlot(cards, state.day, SLOTS[0], state.flags, usedToday);
  show('game');
  renderMeters();
  nextCard();
}

function nextCard() {
  while (!queue.length) {
    slotIndex++;
    if (slotIndex >= SLOTS.length) return showLog();
    queue = drawSlot(cards, state.day, SLOTS[slotIndex], state.flags, usedToday);
  }
  current = queue.shift();
  usedToday.push(current.id);
  mirrored = Math.random() < 0.5;
  renderWhen();
  $('character').textContent = current.character || '';
  $('text').textContent = current.text;
  $('btn-left').textContent = current[actual('left')].label;
  $('btn-right').textContent = current[actual('right')].label;
  $('choice-hint').textContent = '';
  const card = $('card');
  card.style.transform = '';
  card.classList.remove('leaving');
  card.classList.add('entering');
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('entering')));
  previewEffect(null);
  busy = false;
}

// `shownSide` is the side the player swiped or clicked; it maps to the card's data side via actual().
// Day name plus a strip of the four parts of the day; the current one is highlighted.
function renderWhen() {
  const when = $('when');
  when.replaceChildren();
  const day = document.createElement('span');
  day.className = 'day';
  day.textContent = DAY_NAMES[state.day];
  const strip = document.createElement('span');
  strip.className = 'slots';
  SLOTS.forEach((s, i) => {
    const pill = document.createElement('span');
    pill.className = 'slot' + (i === slotIndex ? ' now' : i < slotIndex ? ' done' : '');
    pill.title = SLOT_NAMES[s];
    pill.innerHTML = `<span class="icon">${SLOT_ICONS[s]}</span><span class="label">${SLOT_NAMES[s]}</span>`;
    strip.append(pill);
  });
  when.append(day, strip);
}

function choose(shownSide) {
  if (busy || !current) return;
  busy = true;
  const side = actual(shownSide);
  const card = $('card');
  card.classList.add('leaving');
  card.style.transform = `translateX(${shownSide === 'left' ? -150 : 150}%) rotate(${shownSide === 'left' ? -20 : 20}deg)`;
  applyChoice(state, current, side);
  if (!state.seen.includes(current.id)) state.seen.push(current.id);
  dayLog.push({ card: current, side });
  previewEffect(null);
  renderMeters();
  const fall = checkFall(state.meters);
  setTimeout(() => (fall ? showEnding(fallEndingId(fall)) : nextCard()), 350);
}

function showLog() {
  $('log-title').textContent = DAY_NAMES[state.day];
  const list = $('log-list');
  list.replaceChildren();
  for (const { card, side } of dayLog) {
    const comment = (card[side].logChoice) || card.log;
    // Risky choices are listed even without a comment, so the player sees where to take a second look.
    if (!comment && !isRisky(card, side)) continue;
    list.append(logItem(card, side, comment, false));
  }
  if (!list.children.length) {
    const li = document.createElement('li');
    li.textContent = 'Klidný den, nic k zápisu.';
    list.append(li);
  }
  $('btn-log-next').textContent = state.day < 4 ? `Pokračovat na ${DAY_NAMES_ACC[state.day + 1]}` : 'Doplout do přístavu';
  show('log');
}

// One entry of the daily log or of the "what led to this" block on an ending.
function logItem(card, side, comment, withContext) {
  const li = document.createElement('li');
  const risky = isRisky(card, side);
  li.classList.toggle('risky', risky);
  if (withContext) {
    const ctx = document.createElement('p');
    ctx.className = 'log-context';
    ctx.textContent = card.text;
    li.append(ctx);
  }
  const choice = document.createElement('p');
  choice.className = 'log-choice';
  choice.textContent = `${risky ? '⚠️ ' : ''}${card.character ? card.character + ': ' : ''}${card[side].label}`;
  li.append(choice);
  if (comment) {
    const p = document.createElement('p');
    p.className = 'log-comment';
    p.textContent = comment;
    li.append(p);
  }
  return li;
}

// Fills the "Co k tomu vedlo" block with the choices that pushed `meter` towards `edge`.
function renderCauses(history, meter, edge, onlyRisky = false) {
  const list = $('causes-list');
  list.replaceChildren();
  const causes = topCauses(history, cards, meter, edge, { onlyRisky });
  for (const { card, side } of causes) {
    list.append(logItem(card, side, card[side].logChoice || card.log, true));
  }
  $('ending-causes').hidden = !causes.length;
  return causes.length;
}

// Sentence for a meter that ended near an edge. The authored `near` text names a mistake,
// so it is used only when a risky choice actually pushed the meter there.
function nearSentence({ meter, edge }, blamed) {
  if (blamed) return endings.find((y) => y.id === `${meter}-${edge}`).near;
  return `${METER_ICONS[meter]} ${METER_NAMES[meter]}: na konci blízko kraje (${state.meters[meter]}) – spíš cena za správné kroky než chyba.`;
}

// Meters outside GOOD_RANGE at the end, worst first, as { meter, edge, distance }.
function nearEdges() {
  return METERS
    .map((m) => {
      const v = state.meters[m];
      const edge = v < 50 ? 0 : 100;
      return { meter: m, edge, distance: Math.abs(v - edge) };
    })
    .filter((x) => state.meters[x.meter] < GOOD_RANGE[0] || state.meters[x.meter] > GOOD_RANGE[1])
    .sort((a, b) => a.distance - b.distance);
}

function afterLog() {
  if (state.day < 4) {
    startNextDay(state);
    startDay();
  } else {
    showEnding(goodEndingId(state));
  }
}

function showEnding(id) {
  const e = endings.find((x) => x.id === id);
  markEndingFound(id);
  $('ending-icon').textContent = e.icon;
  $('ending-kicker').textContent = e.kind === 'fall' ? `Pád · ${DAY_NAMES[state.day]}` : 'Konec plavby';
  $('ending-title').textContent = e.title;
  $('ending-text').textContent = e.text;
  $('ending-debrief').textContent = e.debrief;
  const near = $('ending-near');
  near.hidden = true;
  $('ending-causes').hidden = true;
  if (e.kind === 'fall') {
    const [meter, edge] = id.split('-');
    renderCauses(state.history.filter((h) => h.day === state.day), meter, Number(edge));
  } else if (id === 'scarred-harbor') {
    const edges = nearEdges();
    const blamed = new Set(edges.filter((x) => topCauses(state.history, cards, x.meter, x.edge, { onlyRisky: true }).length).map((x) => x.meter));
    near.textContent = edges.map((x) => nearSentence(x, blamed.has(x.meter))).join('\n');
    near.hidden = !edges.length;
    const worst = edges.find((x) => blamed.has(x.meter));
    if (worst) renderCauses(state.history, worst.meter, worst.edge, true);
  }
  const sealBox = $('seal');
  sealBox.hidden = e.kind !== 'good';
  if (e.kind === 'good') {
    $('seal-code').textContent = sealCode();
    try { localStorage.removeItem(STORAGE_STATE); } catch { /* ignore */ }
    $('btn-ending-next').textContent = 'Hrát znovu a hledat další konce';
    $('btn-ending-next').onclick = () => { state = newState(); startDay(); };
  } else {
    $('btn-ending-next').textContent = `Zkusit ${DAY_NAMES_ACC[state.day]} znovu`;
    $('btn-ending-next').onclick = () => { restoreCheckpoint(state); startDay(); };
  }
  $('found-ending').textContent = foundText();
  show('ending');
}

// TODO: personal, verifiable code once registration integration is decided (see NAVRH.md, Otevřené body).
function sealCode() {
  let code = load(STORAGE_SEAL, null);
  if (!code) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
    code = `NAV27-${chars.slice(0, 4)}-${chars.slice(4)}`;
    save(STORAGE_SEAL, code);
  }
  return code;
}

// ---------- input ----------

function setupSwipe() {
  const card = $('card');
  let startX = null;
  let dx = 0;

  card.addEventListener('pointerdown', (ev) => {
    if (busy) return;
    startX = ev.clientX;
    dx = 0;
    card.setPointerCapture(ev.pointerId);
    card.classList.add('dragging');
  });

  card.addEventListener('pointermove', (ev) => {
    if (startX === null) return;
    dx = ev.clientX - startX;
    card.style.transform = `translateX(${dx}px) rotate(${dx / 20}deg)`;
    const side = dx < -20 ? 'left' : dx > 20 ? 'right' : null;
    $('choice-hint').textContent = side ? current[actual(side)].label : '';
    $('choice-hint').className = 'choice-hint' + (side ? ` ${side}` : '');
    previewEffect(side ? current[actual(side)].effect : null);
  });

  const end = () => {
    if (startX === null) return;
    startX = null;
    card.classList.remove('dragging');
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      choose(dx < 0 ? 'left' : 'right');
    } else {
      card.style.transform = '';
      $('choice-hint').textContent = '';
      previewEffect(null);
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);

  for (const side of ['left', 'right']) {
    const btn = $(`btn-${side}`);
    btn.addEventListener('click', () => choose(side));
    const preview = () => current && previewEffect(current[actual(side)].effect);
    btn.addEventListener('pointerenter', preview);
    btn.addEventListener('focus', preview);
    btn.addEventListener('pointerleave', () => previewEffect(null));
    btn.addEventListener('blur', () => previewEffect(null));
  }

  document.addEventListener('keydown', (ev) => {
    if ($('screen-game').hidden) return;
    if (ev.key === 'ArrowLeft') choose('left');
    if (ev.key === 'ArrowRight') choose('right');
  });
}

// ---------- boot ----------

async function boot() {
  [cards, endings] = await Promise.all([
    fetch('data/cards.json').then((r) => r.json()),
    fetch('data/endings.json').then((r) => r.json()),
  ]);
  setupSwipe();
  $('btn-new').onclick = () => { state = newState(); startDay(); };
  $('btn-continue').onclick = () => {
    // Resume exactly where the day started (no clamping, unlike a retry after a fall).
    state = { ...newState(), ...load(STORAGE_STATE, null) }; // newState() supplies fields older saves lack
    Object.assign(state, structuredClone(state.checkpoint));
    startDay();
  };
  $('btn-log-next').onclick = afterLog;
  showIntro();
}

boot().catch((err) => {
  document.body.textContent = `Hru se nepodařilo načíst: ${err.message}`;
});
