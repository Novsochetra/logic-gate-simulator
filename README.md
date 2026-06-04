# Logic Gate Simulator

A browser-based digital logic circuit simulator. Build circuits from basic gates (AND, NOT), toggle inputs, watch outputs light up, and compose sub-circuits into reusable custom IC blocks — all with a live simulation engine.

## Quick Start

Open `index.html` in any modern browser. No build step, no dependencies, no server needed.

```sh
# Just open the file
open index.html
```

## Features

- **6 component types** — Input toggles, Output LEDs, AND gates, NOT gates, Label Boxes, and Overlay Labels
- **Live simulation** — Toggle play/pause (Space) to propagate logic through your circuit every 1ms
- **Custom ICs** — Select components and press `G` to pack them into a reusable integrated circuit; `Shift+G` to unpack
- **Manhattan wiring** — Orthogonal point-to-point wiring with draggable waypoints for manual routing
- **Undo/Redo** — Full undo/redo stack (up to 50 states) with `Cmd/Ctrl+Z` and `Cmd/Ctrl+Y`
- **Copy/Paste** — Copy components with `Cmd/Ctrl+C`, paste with `Cmd/Ctrl+V`; clipboard persists across sessions
- **Import/Export** — Save and load circuits as `.json` files
- **Workspaces** — Manage multiple independent circuits in separate workspaces
- **Minimap** — Bottom-right overview for navigation and zoom
- **Infinite canvas** — Pan, zoom (scroll/pinch), and snap-to-grid placement
- **Label editing** — Double-click components to edit labels inline
- **Mobile support** — Touch events, pinch-to-zoom, double-tap for label editing
- **Dark theme** — Glassmorphism UI with CSS custom properties

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1`–`6` | Spawn component at screen center |
| `V` | Pan mode |
| `S` | Select mode |
| `Space` | Play / Pause simulation |
| `G` | Create Custom IC from selection |
| `Shift+G` | Unpack selected IC |
| `Cmd/Ctrl+Z` | Undo |
| `Cmd/Ctrl+Y` | Redo |
| `Cmd/Ctrl+C` | Copy |
| `Cmd/Ctrl+V` | Paste |
| `Cmd/Ctrl+A` | Select all |
| `Delete` | Delete selected |
| `Cmd/Ctrl+0` | Reset view |
| `+`/`-` | Zoom in / out |
| `Escape` | Deselect / Cancel |
| `H` | Help modal |

## Architecture

Vanilla JavaScript (ES modules) with HTML5 Canvas rendering. No frameworks, no build tools.

```
js/
├── main.js          App entry point, event handling
├── Component.js     Component class (gates, inputs, outputs, ICs, labels)
├── constants.js     Grid size, theme colors, dimensions
├── state.js         Global mutable state (selection, drag, undo, simulation)
├── render.js        Canvas drawing (components, wires, grid, minimap)
├── wiring.js        Wire pathfinding, hit detection, waypoints
├── camera.js        Pan/zoom camera transforms
├── canvas.js        Canvas setup, resize, DPR
├── grid.js          Grid rendering
└── utils.js         Math helpers, geometry, serialization
```

## State Persistence

Circuits auto-save to `localStorage` on every change and restore on page load. Workspace data and clipboard are also persisted, so you can copy circuits across workspaces and browser sessions.
