import { popupVisible, popupSelectedIndex, setPopupSelectedIndex, setPopupVisible, setPopupSourcePin } from "../state.js";
import { popup } from "../dom.js";
import { selectPopupItem } from "../actions.js";

export function updatePopupSel() {
  popup.querySelectorAll(".popup-item").forEach((item, i) =>
    item.classList.toggle("selected", i === popupSelectedIndex)
  );
}

export function setupPopupUI() {
  popup.querySelectorAll(".popup-item").forEach((item, i) => {
    item.addEventListener("mouseenter", () => { setPopupSelectedIndex(i); updatePopupSel(); });
    item.addEventListener("click", selectPopupItem);
  });
  document.addEventListener("mousedown", e => {
    if (popupVisible && !popup.contains(e.target)) {
      popup.classList.remove("show");
      setPopupVisible(false);
      setPopupSourcePin(null);
    }
  });
}
