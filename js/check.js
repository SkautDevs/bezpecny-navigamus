// Content checker: validates event cards/endings, simulates games for balance,
// and renders all cards as a readable script for reviewers.
import { METERS, SLOTS, DAYS, SLOT_SIZE, simulate } from './engine.js';
import { EVENTS, TOPICS, resolveEvent, DAY_NAMES, SLOT_NAMES, METER_ICONS } from './events.js';
import { $, el, setEventParam } from './dom.js';

const SIM_RUNS = 2000;

function validate(cards, endings, topics) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const flagsSet = new Set();
  const flagsUsed = new Set();

  for (const [i, c] of cards.entries()) {
    const where = c.id ? `„${c.id}“` : `karta #${i}`;
    if (!c.id) errors.push(`${where}: chybí id`);
    else if (ids.has(c.id)) errors.push(`${where}: duplicitní id`);
    ids.add(c.id);
    if (!DAYS.includes(c.day)) errors.push(`${where}: neplatný day ${c.day}`);
    if (!SLOTS.includes(c.slot)) errors.push(`${where}: neplatný slot ${c.slot}`);
    if (!topics.includes(c.topic)) errors.push(`${where}: nepovolené topic ${c.topic}`);
    if (!c.text) errors.push(`${where}: chybí text`);
    if (!['left', 'right', 'both', 'neither'].includes(c.intended)) warnings.push(`${where}: chybí intended`);
    for (const side of ['left', 'right']) {
      const ch = c[side];
      if (!ch || !ch.label) { errors.push(`${where}: chybí ${side}.label`); continue; }
      for (const [m, v] of Object.entries(ch.effect || {})) {
        if (!METERS.includes(m)) errors.push(`${where}: ${side} neznámý ukazatel ${m}`);
        if (typeof v !== 'number' || Math.abs(v) > 50) errors.push(`${where}: ${side}.${m} mimo −50…50`);
      }
      if (!ch.effect || !Object.keys(ch.effect).length) warnings.push(`${where}: ${side} nemá žádný dopad`);
      (ch.set || []).forEach((f) => flagsSet.add(f));
    }
    (c.requires || []).forEach((f) => flagsUsed.add(f));
    (c.excludes || []).forEach((f) => flagsUsed.add(f));
    if (c.required && (c.requires || []).length) errors.push(`${where}: povinná karta nesmí mít requires (nemusela by padnout)`);
    if (c.required && !c.log && !(c.left?.logChoice && c.right?.logChoice)) warnings.push(`${where}: povinná karta bez textu do deníku`);
  }

  for (const f of flagsUsed) if (!flagsSet.has(f)) errors.push(`příznak „${f}“ se vyžaduje, ale žádná volba ho nenastavuje`);
  for (const f of flagsSet) if (!flagsUsed.has(f)) warnings.push(`příznak „${f}“ se nastavuje, ale nic ho nepoužívá`);

  for (const t of topics) {
    if (!cards.some((c) => c.topic === t && c.required)) warnings.push(`téma ${t} nemá povinnou kartu`);
  }
  for (const d of DAYS) for (const s of SLOTS) {
    const n = cards.filter((c) => c.day === d && c.slot === s && !(c.requires || []).length).length;
    if (n < SLOT_SIZE) warnings.push(`${DAY_NAMES[d]} ${SLOT_NAMES[s]}: jen ${n} karet bez podmínky (cíl ${SLOT_SIZE})`);
  }

  for (const m of METERS) for (const edge of [0, 100]) {
    const e = endings.find((x) => x.id === `${m}-${edge}`);
    if (!e) errors.push(`chybí konec ${m}-${edge}`);
    else if (!e.near) errors.push(`konec ${m}-${edge}: chybí věta „near“ pro Přístav s šrámy`);
  }
  return { errors, warnings };
}

function runSimulations(cards) {
  const policies = {
    'náhodně': (card, state, rng) => (rng() < 0.5 ? 'left' : 'right'),
    'zamýšlená volba': (card, state, rng) =>
      (['left', 'right'].includes(card.intended) ? card.intended : rng() < 0.5 ? 'left' : 'right'),
    'vyvažuje': (card, state) => {
      const cost = (side) => METERS.reduce((sum, m) => {
        const v = state.meters[m] + ((card[side].effect || {})[m] || 0);
        return sum + (v - 50) ** 2;
      }, 0);
      return cost('left') <= cost('right') ? 'left' : 'right';
    },
  };
  const rows = [];
  for (const [name, policy] of Object.entries(policies)) {
    const endings = {};
    const falls = {};
    let totalFalls = 0;
    let stuck = 0;
    for (let i = 0; i < SIM_RUNS; i++) {
      const r = simulate(cards, policy);
      if (r.ending) endings[r.ending] = (endings[r.ending] || 0) + 1; else stuck++;
      for (const f of r.falls) falls[f] = (falls[f] || 0) + 1;
      totalFalls += r.falls.length;
    }
    rows.push({ name, endings, falls, avgFalls: totalFalls / SIM_RUNS, stuck });
  }
  return rows;
}

function fmtEffect(effect = {}) {
  return METERS.filter((m) => effect[m])
    .map((m) => `${METER_ICONS[m]} ${effect[m] > 0 ? '+' : ''}${effect[m]}`)
    .join('  ') || '—';
}

function renderList(target, items, cls) {
  const ul = el('ul', cls);
  for (const it of items) ul.append(el('li', '', it));
  if (!items.length) ul.append(el('li', 'ok', 'Nic.'));
  target.replaceChildren(ul);
}

function renderSim(rows) {
  const table = el('table');
  table.innerHTML = '<tr><th>Hráč</th><th>Dobré konce</th><th>Pády (celkem za 2000 her)</th><th>Pádů na hru</th><th>Zaseknuté</th></tr>';
  for (const r of rows) {
    const tr = el('tr');
    const fmt = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(', ') || '—';
    tr.append(el('td', '', r.name), el('td', '', fmt(r.endings)), el('td', '', fmt(r.falls)),
      el('td', '', r.avgFalls.toFixed(2)), el('td', '', String(r.stuck)));
    table.append(tr);
  }
  const random = rows.find((r) => r.name === 'náhodně');
  const rare = METERS.flatMap((m) => [`${m}-0`, `${m}-100`])
    .filter((id) => (random.falls[id] || 0) < SIM_RUNS * 0.05)
    .map((id) => `konec ${id}: jen ${random.falls[id] || 0}× za ${SIM_RUNS} náhodných her (cíl ≥ ${SIM_RUNS * 0.05})`);
  const intended = rows.find((r) => r.name === 'zamýšlená volba');
  if (intended.stuck || intended.avgFalls > 0.3) rare.push(`hráč se zamýšlenými volbami padá ${intended.avgFalls.toFixed(2)}× za hru`);
  const wrap = el('div');
  wrap.append(table);
  if (rare.length) {
    wrap.append(el('h3', '', 'Balance'));
    const ul = el('ul', 'warnings');
    for (const r of rare) ul.append(el('li', '', r));
    wrap.append(ul);
  }
  $('sim').replaceChildren(wrap);
}

function renderScript(cards) {
  const root = $('script');
  root.replaceChildren();
  for (const d of DAYS) {
    root.append(el('h2', '', DAY_NAMES[d]));
    for (const s of SLOTS) {
      const slotCards = cards.filter((c) => c.day === d && c.slot === s);
      if (!slotCards.length) continue;
      root.append(el('h3', '', SLOT_NAMES[s]));
      for (const c of slotCards) {
        const art = el('article', 'card');
        const meta = [c.id, c.topic, c.required ? 'POVINNÁ' : null, c.intended ? `zamýšleno: ${c.intended}` : null,
          c.requires ? `vyžaduje: ${c.requires.join(', ')}` : null,
          c.excludes ? `vylučuje: ${c.excludes.join(', ')}` : null].filter(Boolean).join(' · ');
        art.append(el('p', 'meta', meta));
        if (c.character) art.append(el('p', 'character', c.character));
        art.append(el('p', 'text', c.text));
        for (const side of ['left', 'right']) {
          const ch = c[side];
          const p = el('div', 'choice');
          p.append(el('span', 'side', side === 'left' ? '← ' : '→ '), el('span', 'label', ch.label),
            el('span', 'effect', fmtEffect(ch.effect)));
          if (ch.set) p.append(el('span', 'flag', `nastaví: ${ch.set.join(', ')}`));
          if (ch.logChoice) p.append(el('p', 'log', `📖 ${ch.logChoice}`));
          art.append(p);
        }
        if (c.log) art.append(el('p', 'log', `📖 ${c.log}`));
        root.append(art);
      }
    }
  }
}

function renderSwitcher(activeEvent) {
  const box = $('event-switcher');
  box.replaceChildren();
  for (const ev of Object.values(EVENTS)) {
    const btn = el('button', ev.id === activeEvent.id ? 'active' : '', ev.label);
    btn.onclick = () => {
      setEventParam(ev.id);
      boot(ev);
    };
    box.append(btn);
  }
}

async function boot(ev = resolveEvent()) {
  renderSwitcher(ev);
  $('sim').textContent = 'Počítám…';
  const [cards, endings] = await Promise.all([
    fetch(ev.cards).then((r) => r.json()),
    fetch(ev.endings).then((r) => r.json()),
  ]);
  const required = cards.filter((c) => c.required).length;
  $('summary').textContent = `${ev.title}: ${cards.length} karet, z toho ${required} povinných.`;
  const { errors, warnings } = validate(cards, endings, TOPICS);
  renderList($('errors'), errors, 'errors');
  renderList($('warnings'), warnings, 'warnings');
  renderScript(cards);
  setTimeout(() => renderSim(runSimulations(cards)), 50);
}

boot().catch((err) => {
  $('summary').textContent = `Chyba při načítání: ${err.message}`;
});
