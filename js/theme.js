const STORAGE_KEY = "logicSimulatorTheme";

export const THEME_LIST = ["dark", "light", "gruvbox", "dracula", "nord"];

let activeTheme = localStorage.getItem(STORAGE_KEY) || "dark";

const listeners = [];

export function getActiveThemeKey() {
  return activeTheme;
}

export function setTheme(name) {
  if (!THEME_LIST.includes(name)) return;
  if (activeTheme === name) return;
  activeTheme = name;
  localStorage.setItem(STORAGE_KEY, name);
  document.documentElement.setAttribute("data-theme", name);
  listeners.forEach(fn => fn(name));
}

export function cycleTheme() {
  const idx = THEME_LIST.indexOf(activeTheme);
  const next = THEME_LIST[(idx + 1) % THEME_LIST.length];
  setTheme(next);
}

export function initTheme() {
  document.documentElement.setAttribute("data-theme", activeTheme);
}

export function onThemeChange(fn) {
  listeners.push(fn);
}
