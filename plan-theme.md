# Theme Modal — Implementation Plan

## Overview
Move theme selection from inline nav/hamburger items into a dedicated modal, matching the Workspace modal UX. Arrow keys navigate and preview themes live; Enter confirms; Escape closes.

---

## Files to modify

| File | Change |
|------|--------|
| `index.html` | Remove nav bar cycle button + its nav-dividers. Remove top-right cycle button. Replace 5 hamburger theme items with single `🎨 Theme` menu item. Add theme modal markup. |
| `css/styles.css` | Add `.theme-option` row styles — card with hover state and `--color-primary` left border on selected row. |
| `js/main.js` | Remove old cycle button refs/handlers. Add modal controls with keyboard nav (arrow keys = live preview, enter = confirm+close, esc = close). |

---

## No changes to
- `js/theme.js`
- `js/constants.js`
- CSS theme variable blocks (`[data-theme="..."]`)

---

## Modal HTML (matching workspace modal pattern)

```html
<div class="modal-overlay" id="themeModal">
  <div class="help-content" style="width: 380px;">
    <div class="help-header">
      <h2>Choose Theme</h2>
      <button id="closeThemeBtn">&times;</button>
    </div>
    <div id="themeList"></div>
  </div>
</div>
```

Theme rows rendered dynamically by JS in `renderThemeList()` to keep selection state in sync.

---

## Theme card design (5 simple text rows)

```
┌──────────────────────────────────────┐
│  Choose Theme                    ×  │
│──────────────────────────────────────│
│  Dark                                │
│  Light                               │
│  Gruvbox                             │
│  Dracula                             │
│  Nord                                │
└──────────────────────────────────────┘
```

- Selected row: `--color-primary` left border + subtle background tint (matching `.workspace-item.active`)
- Hover: same hover style as `.workspace-item`

---

## Keyboard behavior (when theme modal is open)

| Key | Action |
|-----|--------|
| `↓` | Move selection down (wrap around) + apply theme live |
| `↑` | Move selection up (wrap around) + apply theme live |
| `Enter` | Confirm selection + close modal |
| `Escape` | Close modal (last previewed theme stays) |
| Any other key | Blocked (matching workspace/help modal pattern) |

---

## JS functions to add

| Function | Purpose |
|----------|---------|
| `openThemeModal()` | Show modal, set `selectedThemeIndex` to current theme, `renderThemeList()` |
| `closeThemeModal()` | Hide modal |
| `renderThemeList()` | Build 5 `.theme-option` rows from `THEME_LIST`, highlight current |
| `updateThemeSelection()` | Update `selectedThemeIndex`, highlight row, `setTheme(name)`, `draw()` |

---

## Click behavior
- Click a theme row → `setTheme(name)` + `draw()` + close modal
- Click close button (×) → close modal
- Click overlay background → close modal

---

## Keyboard shortcut
- `Ctrl/Cmd + T` still cycles themes (from `js/main.js` keydown handler, unchanged)
