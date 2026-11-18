// Game UI: screens, event skinning, swipe handling, persistence. Rules live in engine.js.
import {
  METERS, SLOTS, LAST_DAY, GOOD_RANGE, newState, snapshot, restoreCheckpoint, drawSlot,
  applyChoice, checkFall, fallEndingId, goodEndingId, startNextDay, isRisky, topCauses,
} from './engine.js';
import {
  EVENTS, resolveEvent, DAY_NAMES, DAY_NAMES_ACC, SLOT_NAMES, SLOT_ICONS,
  METER_ICONS, METER_NAMES,
} from './events.js';
import { $, el, setEventParam } from './dom.js';

const SWIPE_THRESHOLD = 90; // px of horizontal drag that commits a choice

let activeEvent = resolveEvent();
let cards = [];
let cardsById = new Map();
let endings = [];
let state = null;
let slotIndex = 0;
let queue = [];
let current = null;
let presented = null; // { left: 'left'|'right', right: 'left'|'right' } mapping shown side -> data side
let usedToday = [];
let busy = false;

function storageKey(suffix) {
  return `sfh:${activeEvent.id}:${suffix}`;
}

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
  const key = storageKey('endings');
  const found = load(key, []);
  if (!found.includes(id)) save(key, [...found, id]);
}

function foundText() {
  const found = load(storageKey('endings'), []);
  return found.length ? `Objevené konce: ${found.length} / ${endings.length}` : '';
}

// ---------- event loading & skinning ----------

function applyEventChrome(ev) {
  document.title = ev.title;
  $('event-theme').href = ev.css;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = ev.themeColor;

  $('intro-kicker').textContent = ev.kicker;
  $('intro-title').textContent = ev.title;
  $('intro-body').textContent = ev.intro;
  $('service-health').textContent = ev.healthTeam;
  $('service-info').textContent = ev.infoTeam;
  $('log-kicker').textContent = ev.logKicker;
  $('ending-debrief-heading').textContent = ev.debriefHeading;
  $('seal-title').textContent = ev.sealTitle;
}

function renderEventSwitcher() {
  const box = $('event-switcher');
  box.replaceChildren();
  for (const ev of Object.values(EVENTS)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'event-pill' + (ev.id === activeEvent.id ? ' active' : '');
    btn.textContent = ev.label;
    btn.setAttribute('aria-pressed', String(ev.id === activeEvent.id));
    btn.onclick = () => switchEvent(ev.id);
    box.append(btn);
  }
}

async function loadEventData(ev) {
  const [nextCards, nextEndings] = await Promise.all([
    fetch(ev.cards).then((r) => r.json()),
    fetch(ev.endings).then((r) => r.json()),
  ]);
  activeEvent = ev;
  cards = nextCards;
  endings = nextEndings;
  cardsById = new Map(cards.map((c) => [c.id, c]));
  applyEventChrome(ev);
  renderEventSwitcher();
}

async function switchEvent(id) {
  if (id === activeEvent.id || !EVENTS[id]) return;
  await loadEventData(EVENTS[id]);
  setEventParam(id);
  showIntro();
}

// ---------- screens ----------

function show(name) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== `screen-${name}`;
  const focusTarget = {
    intro: $('intro-title'),
    game: $('card'),
    log: $('log-title'),
    ending: $('ending-title'),
  }[name];
  if (focusTarget) focusTarget.focus({ preventScroll: true });
}

function showIntro() {
  const saved = load(storageKey('state'), null);
  const btnContinue = $('btn-continue');
  const btnNew = $('btn-new');
  btnContinue.hidden = !saved;
  if (saved) {
    btnContinue.textContent = `Pokračovat (${DAY_NAMES_ACC[saved.checkpoint.day]})`;
    btnNew.textContent = 'Začít znovu';
    btnNew.classList.remove('primary');
  } else {
    btnNew.textContent = activeEvent.ctaStart;
    btnNew.classList.add('primary');
  }
  $('found-intro').textContent = foundText();
  show('intro');
}

// ---------- meters ----------

function renderMeters() {
  const box = $('meters');
  if (!box.children.length) {
    for (const m of METERS) {
      const meter = el('div', 'meter');
      meter.dataset.meter = m;
      meter.title = METER_NAMES[m];
      meter.setAttribute('role', 'meter');
      meter.setAttribute('aria-label', METER_NAMES[m]);
      meter.setAttribute('aria-valuemin', '0');
      meter.setAttribute('aria-valuemax', '100');
      const gauge = el('span', 'gauge');
      const icon = el('span', 'icon', METER_ICONS[m]);
      icon.setAttribute('aria-hidden', 'true');
      gauge.append(el('span', 'fill'), icon);
      const dot = el('span', 'dot');
      dot.setAttribute('aria-hidden', 'true');
      meter.append(gauge, dot);
      box.append(meter);
    }
  }
  for (const m of METERS) {
    const meter = box.querySelector(`[data-meter="${m}"]`);
    const v = state.meters[m];
    meter.setAttribute('aria-valuenow', String(v));
    meter.querySelector('.fill').style.height = `${v}%`;
    meter.classList.toggle('danger', v <= 15 || v >= 85);
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
  save(storageKey('state'), state);
  slotIndex = 0;
  usedToday = [];
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
  const flip = Math.random() < 0.5;
  presented = flip ? { left: 'right', right: 'left' } : { left: 'left', right: 'right' };
  renderWhen();
  $('character').textContent = current.character || '';
  $('text').textContent = current.text;
  $('btn-left').textContent = current[presented.left].label;
  $('btn-right').textContent = current[presented.right].label;
  $('choice-hint').textContent = '';
  $('choice-hint').className = 'choice-hint';
  const card = $('card');
  card.style.transform = '';
  card.classList.remove('leaving');
  card.classList.add('entering');
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.remove('entering')));
  previewEffect(null);
  busy = false;
}

// Day name plus a strip of the four parts of the day; the current one is highlighted.
function renderWhen() {
  const when = $('when');
  when.replaceChildren();
  const day = el('span', 'day', DAY_NAMES[state.day]);
  const strip = el('span', 'slots');
  SLOTS.forEach((s, i) => {
    const pill = el('span', 'slot' + (i === slotIndex ? ' now' : i < slotIndex ? ' done' : ''));
    pill.title = SLOT_NAMES[s];
    pill.append(el('span', 'icon', SLOT_ICONS[s]), el('span', 'label', SLOT_NAMES[s]));
    strip.append(pill);
  });
  when.append(day, strip);
}

function choose(shownSide) {
  if (busy || !current) return;
  busy = true;
  const side = presented[shownSide];
  const card = $('card');
  card.classList.add('leaving');
  card.style.transform = `translateX(${shownSide === 'left' ? -150 : 150}%) rotate(${shownSide === 'left' ? -20 : 20}deg)`;
  applyChoice(state, current, side);
  previewEffect(null);
  renderMeters();
  const fall = checkFall(state.meters);
  setTimeout(() => (fall ? showEnding(fallEndingId(fall)) : nextCard()), 350);
}

function showLog() {
  $('log-title').textContent = DAY_NAMES[state.day];
  const list = $('log-list');
  list.replaceChildren();
  for (const h of state.history) {
    if (h.day !== state.day) continue;
    const card = cardsById.get(h.id);
    if (!card) continue;
    const comment = card[h.side].logChoice || card.log;
    // Risky choices are listed even without a comment, so the player sees where to take a second look.
    if (!comment && !isRisky(card, h.side)) continue;
    list.append(logItem(card, h.side, comment, false));
  }
  if (!list.children.length) {
    list.append(el('li', '', 'Klidný den, nic k zápisu.'));
  }
  $('btn-log-next').textContent = state.day < LAST_DAY ? `Pokračovat na ${DAY_NAMES_ACC[state.day + 1]}` : activeEvent.logFinish;
  show('log');
}

// One entry of the daily log or of the "what led to this" block on an ending.
function logItem(card, side, comment, withContext) {
  const li = document.createElement('li');
  const risky = isRisky(card, side);
  li.classList.toggle('risky', risky);
  if (withContext) li.append(el('p', 'log-context', card.text));
  const prefix = `${risky ? '⚠️ ' : ''}${card.character ? `${card.character}: ` : ''}`;
  li.append(el('p', 'log-choice', `${prefix}${card[side].label}`));
  if (comment) li.append(el('p', 'log-comment', comment));
  return li;
}

// Fills the "Co k tomu vedlo" block with the choices that pushed `meter` towards `edge`.
function renderCauses(history, meter, edge, onlyRisky = false) {
  const list = $('causes-list');
  list.replaceChildren();
  const causes = topCauses(history, cardsById, meter, edge, { onlyRisky });
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
  if (state.day < LAST_DAY) {
    startNextDay(state);
    startDay();
  } else {
    showEnding(goodEndingId(state));
  }
}

function renderEndingDetails(e) {
  const near = $('ending-near');
  near.hidden = true;
  $('ending-causes').hidden = true;
  if (e.kind === 'fall') {
    const [meter, edge] = e.id.split('-');
    renderCauses(state.history.filter((h) => h.day === state.day), meter, Number(edge));
  } else if (e.id === 'scarred-harbor') {
    const edges = nearEdges();
    const blamed = new Set(
      edges.filter((x) => topCauses(state.history, cardsById, x.meter, x.edge, { onlyRisky: true }).length).map((x) => x.meter),
    );
    near.textContent = edges.map((x) => nearSentence(x, blamed.has(x.meter))).join('\n');
    near.hidden = !edges.length;
    const worst = edges.find((x) => blamed.has(x.meter));
    if (worst) renderCauses(state.history, worst.meter, worst.edge, true);
  }
}

function renderEndingActions(e) {
  $('seal').hidden = e.kind !== 'good';
  const btn = $('btn-ending-next');
  if (e.kind === 'good') {
    $('seal-code').textContent = sealCode();
    try { localStorage.removeItem(storageKey('state')); } catch { /* ignore */ }
    btn.textContent = 'Hrát znovu a hledat další konce';
    btn.onclick = () => { state = newState(); startDay(); };
  } else {
    btn.textContent = `Zkusit ${DAY_NAMES_ACC[state.day]} znovu`;
    btn.onclick = () => { restoreCheckpoint(state); startDay(); };
  }
}

function showEnding(id) {
  const e = endings.find((x) => x.id === id);
  markEndingFound(id);
  $('ending-icon').textContent = e.icon;
  $('ending-kicker').textContent = e.kind === 'fall' ? `Pád · ${DAY_NAMES[state.day]}` : 'Konec akce';
  $('ending-title').textContent = e.title;
  $('ending-text').textContent = e.text;
  $('ending-debrief').textContent = e.debrief;
  renderEndingDetails(e);
  renderEndingActions(e);
  $('found-ending').textContent = foundText();
  show('ending');
}

// TODO: personal, verifiable code once registration integration is decided (see DESIGN.md, Otevřené body).
function sealCode() {
  const key = storageKey('seal');
  let code = load(key, null);
  if (!code) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join('');
    code = `${activeEvent.sealPrefix}-${chars.slice(0, 4)}-${chars.slice(4)}`;
    save(key, code);
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
    const shownSide = dx < -20 ? 'left' : dx > 20 ? 'right' : null;
    $('choice-hint').textContent = shownSide ? current[presented[shownSide]].label : '';
    $('choice-hint').className = 'choice-hint' + (shownSide ? ` ${shownSide}` : '');
    previewEffect(shownSide ? current[presented[shownSide]].effect : null);
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
      $('choice-hint').className = 'choice-hint';
      previewEffect(null);
    }
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);

  for (const shownSide of ['left', 'right']) {
    const btn = $(`btn-${shownSide}`);
    btn.addEventListener('click', () => choose(shownSide));
    const preview = () => current && presented && previewEffect(current[presented[shownSide]].effect);
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
  await loadEventData(activeEvent);
  setupSwipe();
  $('btn-new').onclick = () => { state = newState(); startDay(); };
  $('btn-continue').onclick = () => {
    state = { ...newState(), ...load(storageKey('state'), null) };
    restoreCheckpoint(state, { penalty: false });
    startDay();
  };
  $('btn-log-next').onclick = afterLog;
  showIntro();
}

boot().catch((err) => {
  document.body.textContent = `Hru se nepodařilo načíst: ${err.message}`;
});
