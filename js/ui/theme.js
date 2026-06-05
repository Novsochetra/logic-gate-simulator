import { THEME_LIST, getActiveThemeKey, setTheme } from "../theme.js";
import { themeModal, themeList, menuDropdown } from "../dom.js";
import { draw } from "../render.js";

let selectedThemeIndex = 0;

export function renderThemeList() {
  const list = themeList;
  if (!list) return;
  list.innerHTML = "";
  THEME_LIST.forEach((name, i) => {
    const row = document.createElement("div");
    row.className = "theme-option" + (name === getActiveThemeKey() ? " selected" : "");
    row.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    row.addEventListener("click", () => { setTheme(name); draw(); closeThemeModal(); });
    list.appendChild(row);
  });
  const hint = document.createElement("div");
  hint.className = "theme-hint";
  hint.textContent = "\u2191\u2193 to browse \u00b7 Enter to confirm \u00b7 Esc to close";
  list.appendChild(hint);
  selectedThemeIndex = THEME_LIST.indexOf(getActiveThemeKey());
}

export function updateThemeSelection(dir) {
  const rows = themeList?.querySelectorAll(".theme-option");
  if (!rows || !rows.length) return;
  selectedThemeIndex = (selectedThemeIndex + dir + THEME_LIST.length) % THEME_LIST.length;
  rows.forEach(r => r.classList.remove("selected"));
  rows[selectedThemeIndex].classList.add("selected");
  setTheme(THEME_LIST[selectedThemeIndex]);
  draw();
}

export function openThemeModal() {
  themeModal?.classList.add("show");
  renderThemeList();
  menuDropdown?.classList.remove("show");
}

export function closeThemeModal() {
  themeModal?.classList.remove("show");
}

export function setupThemeUI() {
  const themeBtn = document.getElementById("themeBtn");
  const closeThemeBtn = document.getElementById("closeThemeBtn");
  themeBtn?.addEventListener("click", openThemeModal);
  closeThemeBtn?.addEventListener("click", closeThemeModal);
  themeModal?.addEventListener("mousedown", e => { if (e.target === themeModal) closeThemeModal(); });
}
