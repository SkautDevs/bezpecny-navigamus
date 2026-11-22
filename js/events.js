// Shared event configurations and UI labels used by game.js and check.js.

export const DAY_NAMES = { 1: 'Čtvrtek', 2: 'Pátek', 3: 'Sobota', 4: 'Neděle' };
export const DAY_NAMES_ACC = { 1: 'čtvrtek', 2: 'pátek', 3: 'sobotu', 4: 'neděli' };
export const SLOT_NAMES = { morning: 'Ráno', afternoon: 'Odpoledne', evening: 'Večer', night: 'Noc' };
export const SLOT_ICONS = { morning: '🌅', afternoon: '☀️', evening: '🌇', night: '🌙' };
export const METER_ICONS = { safety: '🛡️', trust: '🤝', crew: '👥', energy: '🔋' };
export const METER_NAMES = { safety: 'Bezpečí', trust: 'Důvěra', crew: 'Parta', energy: 'Síly' };

export const TOPICS = [
  'alcohol', 'one-on-one', 'boundaries', 'photos', 'bullying', 'confiding',
  'adult-misconduct', 'where-to-turn', 'water', 'night-quiet', 'fire', 'stranger',
  'smoking', 'self-care', 'code-of-conduct', 'respect',
];

const asset = (path) => new URL(`../${path}`, import.meta.url).href;

export const EVENTS = {
  navigamus: {
    id: 'navigamus',
    label: 'Navigamus',
    title: 'Bezpečný Navigamus',
    kicker: 'Navigamus 2027 · Hlučínské jezero',
    intro: 'Tohle není test, ale trénink. Projdi čtyři dny Navigamu až do neděle a zjistíš, co na akci platí. Když některý ukazatel spadne nebo přeteče, den si prostě zopakuješ. Na konci dostaneš pečeť k registraci.',
    healthTeam: 'SZT',
    infoTeam: 'registrace s informacemi',
    ctaStart: 'Vyplout',
    logKicker: 'Lodní deník',
    logFinish: 'Doplout do přístavu',
    debriefHeading: 'Na Navigamu platí',
    sealTitle: 'Pečeť Bezpečného Navigamu',
    sealPrefix: 'NAV27',
    themeColor: '#1b0e44',
    accentColor: '#c92039',
    css: asset('themes/navigamus.css'),
    cards: asset('data/cards.json'),
    endings: asset('data/endings.json'),
  },
  obrok: {
    id: 'obrok',
    label: 'Obrok',
    title: 'Bezpečný Obrok',
    kicker: 'Obrok 2027 · Roverská akce',
    intro: 'Tohle není test, ale trénink. Projdi čtyři dny Obroku až do neděle a zjistíš, co na akci platí. Když některý ukazatel spadne nebo přeteče, den si prostě zopakuješ. Na konci dostaneš pečeť k registraci.',
    healthTeam: 'SZT',
    infoTeam: 'registrace s informacemi',
    ctaStart: 'Vyrazit na Obrok',
    logKicker: 'Deník dne',
    logFinish: 'Dokončit Obrok',
    debriefHeading: 'Na Obroku platí',
    sealTitle: 'Pečeť Bezpečného Obroku',
    sealPrefix: 'OBR27',
    themeColor: '#15133F',
    accentColor: '#D93814',
    css: asset('themes/obrok.css'),
    cards: asset('data/cards.json'),
    endings: asset('data/obrok/endings.json'),
  },
};

export const DEFAULT_EVENT_ID = 'navigamus';

export function eventUrl(id) {
  return asset(`${id}/`);
}

export function resolveEvent(pathname = window.location.pathname, search = window.location.search) {
  const fromAttr = typeof document !== 'undefined' && document.documentElement?.dataset?.event;
  if (fromAttr && EVENTS[fromAttr]) return EVENTS[fromAttr];

  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    if (EVENTS[segments[i]]) return EVENTS[segments[i]];
  }

  const fromParam = new URLSearchParams(search).get('event');
  if (fromParam && EVENTS[fromParam]) return EVENTS[fromParam];

  return EVENTS[DEFAULT_EVENT_ID];
}
