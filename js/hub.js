// Root event switcher (landing page). Redirects legacy ?event=<id> URLs to the event's full route.
import { EVENTS, DAY_NAMES_ACC, eventUrl } from './events.js';
import { $, el } from './dom.js';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function eventStatus(id) {
  const seal = load(`sfh:${id}:seal`, null);
  const saved = load(`sfh:${id}:state`, null);
  const found = load(`sfh:${id}:endings`, []);
  const parts = [];
  if (seal) parts.push('Pečeť získána');
  if (saved?.checkpoint?.day) parts.push(`Rozehráno (${DAY_NAMES_ACC[saved.checkpoint.day]})`);
  if (found.length) parts.push(`Objevené konce: ${found.length}`);
  return parts.join(' · ');
}

function boot() {
  const legacyId = new URLSearchParams(window.location.search).get('event');
  if (legacyId && EVENTS[legacyId]) {
    window.location.replace(eventUrl(legacyId));
    return;
  }

  const list = $('event-list');
  list.replaceChildren();
  for (const ev of Object.values(EVENTS)) {
    const link = el('a', 'event-card');
    link.href = `${ev.id}/`;
    link.style.setProperty('--event-color', ev.themeColor);
    link.style.setProperty('--event-accent', ev.accentColor);

    link.append(
      el('span', 'event-card-kicker', ev.kicker),
      el('span', 'event-card-title', ev.title),
    );
    const status = eventStatus(ev.id);
    if (status) link.append(el('span', 'event-card-status', status));
    list.append(link);
  }
}

boot();
