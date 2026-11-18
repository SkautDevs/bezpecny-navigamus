// Shared DOM and URL helpers for game.js and check.js.

export const $ = (id) => document.getElementById(id);

export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function setEventParam(id) {
  const url = new URL(window.location.href);
  url.searchParams.set('event', id);
  window.history.replaceState(null, '', url);
}
