# Project Features - Logic Gate Simulator

## Canvas & Viewport
1. **Infinite Canvas** — Pan/drag the canvas freely in any direction; no boundaries.
2. **Grid Display** — Background grid renders dynamically based on camera position and zoom for visual alignment.
3. **Zoom Controls** — Mouse wheel zoom, trackpad pinch zoom (macOS), `+/=` and `-` keyboard shortcuts, and zoom in/out buttons in bottom-left control group.
4. **Zoom Indicator** — Clickable percentage display (bottom-left) that resets view to 100% (also `Cmd/Ctrl + 0`).
5. **Pan Mode (V)** — Default mode; click-drag on empty canvas to pan.
6. **Select Mode (S)** — Click-drag on empty canvas to draw a selection box; selects intersecting components on release.
7. **Canvas Cursor Feedback** — Changes between `grab`, `grabbing`, `crosshair`, `nwse-resize` depending on context.
8. **Camera Persistence** — Zoom/pan state saved to `localStorage` and restored on page load.
9. **Full-Screen Canvas** — Canvas fills entire viewport, respects device pixel ratio (`dpr`) for crisp rendering.

## Component Types
10. **Input Toggle** — Toggle-switch style (iOS-like), click to toggle state (ON/OFF), supports label editing.
11. **Output LED** — Square output indicator the size of one grid cell; glows green when active, supports label editing.
12. **AND Gate** — Two-input logic gate, renders as rounded chip with "AND" label, computes `input1 AND input2`.
13. **NOT Gate** — Single-input logic gate, renders as rounded chip with "NOT" label, computes `NOT input1`.
14. **Label Box** — Resizable bordered box with editable text; ideal for organizing/annotating circuit sections; triangle resize handle in bottom-right corner.
15. **Overlay Label** — Bold centered text overlay (no border unless selected); rendered on top of all other elements; auto-width based on text length.
16. **Custom IC** — User-created integrated circuit from selected components; packs internal logic into a single reusable block; auto-sizes based on label and pin names.

## Bottom Navigation Bar
17. **Floating Bottom Nav** — Centered at bottom of screen, contains tool icons for each component and mode.
18. **Pan Mode Button** — Icon with `V` shortcut badge.
19. **Select Mode Button** — Icon with `S` shortcut badge.
20. **Input Button** — Icon with `1` shortcut badge; clicking spawns Input at canvas center.
21. **Output Button** — Icon with `2` shortcut badge; clicking spawns Output at canvas center.
22. **AND Gate Button** — Icon with `3` shortcut badge; clicking spawns AND Gate at canvas center.
23. **NOT Gate Button** — Icon with `4` shortcut badge; clicking spawns NOT Gate at canvas center.
24. **Label Box Button** — Icon with `5` shortcut badge; clicking spawns Label Box at canvas center.
25. **Overlay Label Button** — Icon with `6` shortcut badge; clicking spawns Overlay Label at canvas center.

## Wiring System
26. **Pin-to-Pin Wiring** — Drag from an output pin to an input pin (or vice versa) to create a wire.
27. **Orthogonal (Manhattan) Wiring** — All wires are drawn as straight lines with rounded corners.
28. **Self-Loop Wiring** — AND/NOT gate output can connect back to its own input; wire routes around the component.
29. **Manual Wire Routing on Creation** — Drag from a pin and release on empty canvas to enter manual routing mode; dashed preview and placement cursor snap to grid as you move; click on canvas to place straight-line waypoints one by one; click on an opposite-type pin to complete the wire with waypoints; click on a same-type pin or press Escape to cancel.
30. **Pin-to-Pin Auto-Route** — Dragging directly from a pin to another opposite-type pin creates an auto-routed (orthogonal) wire with no waypoints.
31. **Wire Visual States** — Active (green), inactive (gray), selected (glowing green with inner white line).
32. **Wire Crossing Discrimination** — Background outline stroke helps distinguish which wire is on top at intersections.
33. **Wire Selection** — Click on a wire to select it; shows waypoints and highlight glow on top of other elements.
34. **Wire Deletion** — Select a wire and press Delete/Backspace to remove it; also removable via selected pin.
35. **Manual Wire Routing (Waypoints)** — Click-drag on an existing wire segment creates a draggable waypoint for manual routing.
36. **Waypoint Manipulation** — Selected wire shows all waypoints as draggable dots; snap to grid.
37. **Waypoint Deletion** — Select a waypoint and press Delete/Backspace to remove it.
38. **Waypoint Proportional Movement** — Dragging components shifts connected waypoints proportionally to preserve routing layout.
39. **Reset Wire to Auto** — Double-click on a wire segment clears custom waypoints and reverts to automatic pathfinding.
40. **Wire Hit Detection** — Distance-based detection with configurable threshold for clicking/nearby interaction.

## Simulation
41. **Play/Pause Simulation** — Top-right button to toggle simulation; space bar shortcut.
42. **State Reset on Sim Toggle** — Simulation starts from fresh state (all components reset) when played; clear all state when stopped.
43. **Clock Oscillator** — Simulation runs at 1ms interval, propagating logic through the circuit each tick.
44. **Logic Propagation** — `calculateNextState()` computes next state for all components; `applyNextState()` applies changes; loop runs until stable.

## Selection & Manipulation
45. **Single Click Selection** — Click a component to select it; shows yellow highlight border.
46. **Multi-Select (Shift/Cmd+Click)** — Add/remove individual components from selection.
47. **Box Selection** — In Select Mode, drag on empty canvas to select all components intersecting the rectangle.
48. **Select All** — `Cmd/Ctrl + A` selects all components on canvas.
49. **Drag Selected Components** — Move selected group by dragging; snaps to half-grid.
50. **Delete Selected** — `Delete/Backspace` removes selected components and their wires.
51. **Component Snapping** — All components snap to half-grid (GRID_SIZE/2).
52. **Resize Label Box** — Drag bottom-right resize handle; snaps to half-grid.
53. **Pin Selection** — Click a pin to select it (shows glow and center dot); delete key removes all wires attached to that pin.
54. **Pin Hover Effect** — Hovering over pins shows radial glow (blue for input, orange for output).

## Label Editing
55. **Double-Click to Edit** — Double-click on Label Box, Custom IC, Overlay Label, Input, or Output to open inline text editor.
56. **Enter to Save** — Press Enter or blur the input to commit label changes.
57. **Auto-Resize Labels** — Overlay Label width adjusts to text; Custom IC width adjusts to label + pin names.
58. **Pin Name Labels on Custom IC** — Input/output names are inherited from original components and rendered as pin labels on the IC boundary.

## Undo / Redo & Persistence
59. **Undo (Cmd/Ctrl + Z)** — Reverts last action; stack up to 50 states. Also available via bottom-right undo button.
60. **Redo (Cmd/Ctrl + Y / Shift+Z)** — Restores previously undone action. Also available via bottom-right redo button.
61. **Auto-Save to localStorage** — Every change automatically saves to `logicSimulatorAutoSave` in browser localStorage.
62. **Auto-Load on Refresh** — Circuit loads automatically from localStorage on page load.

## Copy / Paste
63. **Copy Selected (Cmd/Ctrl + C)** — Copies selected components and their internal wires to clipboard. Also available via selection toolbar.
64. **Copy IC Internals (Cmd/Ctrl + Shift + C)** — Copies internal components/wires of a selected Custom IC.
65. **Paste (Cmd/Ctrl + V)** — Pastes copied components with incremental offset; preserves waypoints. Also available via selection toolbar.
66. **Clipboard Persistence** — Clipboard saved to `localStorage` for cross-session and cross-workspace pasting.
67. **Cross-Workspace Paste** — Copy from one workspace, switch workspaces, paste into another.

## Custom IC
68. **Create IC (G)** — Selected components with at least one input/output can be packed into a Custom IC; external wires rerouted automatically.
69. **Unpack IC (Shift + G)** — Selected Custom ICs are exploded back into individual components with wires restored.
70. **Custom IC Rendering** — Rounded rectangle with label; input/output pins shown with inherited names.

## Import / Export
71. **Export (JSON)** — Saves current circuit (components + wires) as a `.json` file download.
72. **Import (JSON)** — Loads a circuit from a `.json` file via file picker; pushes undo state.

## Hamburger Action Menu
73. **Top-Left Hamburger Menu** — Contains all action buttons organized with dividers and keyboard shortcut hints.
74. **Menu Items** — Workspaces, Create IC (G), Unpack IC (Shift+G), Select All (Ctrl+A), Copy (Ctrl+C), Paste (Ctrl+V), Delete (Del), Copy IC Internals (Ctrl+Shift+C), Export, Import, Theme, Help (H).
75. **Click-Outside-to-Close** — Clicking outside the menu closes it.
76. **Auto-Close on Item Click** — Selecting any menu item closes the dropdown.

## Minimap
77. **Bottom-Right Minimap** — Scaled-down overview of all components, wires, and grid.
78. **Viewport Rectangle** — Shows current visible area; blue border with semi-transparent fill.
79. **Minimap Panning** — Click-drag on minimap to jump camera to that location.
80. **Minimap Zoom Sync** — Scroll wheel on minimap zooms the main canvas.
81. **Minimap Responsive** — Smaller on mobile (110x82px).

## Workspaces
82. **Workspace Manager Modal** — Button in hamburger menu opens workspace management window; Escape closes it (even when focused on the name input).
83. **Create Workspace** — Name input + Create button; Enter key also submits; creates empty workspace and switches to it.
84. **Load Workspace** — Switch between workspaces; loads saved circuit data.
85. **Delete Workspace** — Remove workspace with confirmation dialog; auto-switches to first remaining workspace.
86. **Active Indicator** — Current workspace shown with "Active Workspace" status and blue highlight.
87. **Auto-Save to Active Workspace** — Every change saves to the currently active workspace's data.
88. **Workspace localStorage Persistence** — Workspace list and active workspace ID saved to `localStorage`.

## Help Modal
89. **Help (H)** — Opens modal listing all keyboard shortcuts.
90. **Comprehensive Shortcut List** — Includes all mode keys, component keys, simulation, undo/redo, copy/paste, zoom, select all, delete, escape, double-click actions, and theme cycling (Ctrl/Cmd+T).
91. **Close on Escape** — Escape key closes the help modal.
92. **Click Outside to Close** — Click overlay to dismiss.

## Mobile / Touch Support
93. **Touch Event Handling** — `touchstart`, `touchmove`, `touchend` dispatched as mouse events for canvas and minimap.
94. **Pinch-to-Zoom** — Two-finger pinch gesture for zooming on mobile.
95. **Double-Tap Detection** — Converts rapid taps into `dblclick` events for editing labels and resetting wires.
96. **Mobile-Friendly Navigation** — Nav bar adapts with smaller icons and horizontal scroll.
97. **Minimap Mobile Size** — Smaller minimap on mobile viewports.
98. **Tooltips Disabled on Mobile** — CSS tooltips hidden (`display: none`) on mobile to avoid touch clutter.
99. **Zoom Group Mobile Position** — Adjusted positioning for bottom controls on mobile.
114. **Undo/Redo Buttons** — Bottom-right glass panel with undo/redo icons; disabled when no history available.
115. **Selection Toolbar** — Top-center glass panel (Delete, Copy, Paste) appears only when components/wires/pins are selected; synced to selection state.

## Theming & Visual Polish
100. **CSS Custom Properties (Multi-Theme)** — Comprehensive design token system (`--color-*` CSS variables) with 5 theme variants controlled by `data-theme` attribute on `<html>`.
101. **Canvas Color Theme (THEME Proxy)** — JavaScript color tokens for all canvas-rendered elements served via Proxy for zero-change theme switching across all rendering modules.
102. **Theme Modal** — Hamburger menu → Theme opens a modal with 5 selectable theme rows (Dark, Light, Gruvbox, Dracula, Nord); selected row bordered with primary color.
103. **Theme Keyboard Navigation** — Arrow Up/Down to browse themes with live preview; Enter to confirm and close; Escape to close.
104. **Theme Keyboard Shortcut** — `Cmd/Ctrl + T` cycles through all 5 themes.
105. **Theme Persistence** — Active theme saved to `localStorage` (`logicSimulatorTheme`) and restored on page load; defaults to Dark.
106. **CSS Tooltips** — Pure CSS tooltips with `data-tooltip` attribute; positions: top, bottom, left, right.
107. **Glassmorphism UI** — Backdrop blur effects on panels, nav bar, menu, and modals.
108. **Responsive Media Queries** — Mobile breakpoint at 768px with adjusted sizes and hidden elements.

## Architecture
118. **Modular ES Module Structure** — `main.js` acts as a lightweight orchestrator (~54 lines) that imports and initializes focused sub-modules:
    - `state.js` — single source of truth for all shared application and interaction state with getter/setter pairs.
    - `dom.js` — centralized DOM element references used across the app.
    - `constants.js` — design tokens, GRID_SIZE, and zoom bounds (ZOOM_MIN / ZOOM_MAX / ZOOM_FACTOR).
    - `canvas.js` — canvas setup, DPR handling, and context management.
    - `camera.js` — zoom, pan, and camera persistence utilities.
    - `utils.js` — coordinate transforms, grid snapping, and geometry helpers.
    - `grid.js` — dynamic background grid rendering.
    - `render.js` — main draw loop delegating to component, wire, and minimap renderers.
    - `Component.js` — component class definitions and canvas draw methods.
    - `wiring.js` — orthogonal path routing, wire hit detection, and waypoint helpers.
    - `serialization.js` — circuit JSON serialize/parse/load with Custom IC support.
    - `history.js` — undo/redo stack management and localStorage persistence.
    - `simulation.js` — play/pause simulation loop and tick evaluation.
    - `actions.js` — high-level user actions: spawn, delete, copy, paste, label editing, IC create/unpack, import/export.
    - `ui/theme.js`, `ui/workspace.js`, `ui/popup.js`, `ui/menu.js`, `ui/toolbar.js` — UI initialization for respective modals, dropdowns, nav bars, and selection toolbar.
    - `input/mouse.js`, `input/keyboard.js`, `input/touch.js`, `input/minimap.js`, `input/zoom.js` — raw input event handlers isolated by device/input surface.
119. **No Local State Shadowing** — All mutable state (workspaces, clipboard, active workspace ID, editing component) lives in `state.js` and is accessed via exported live bindings and setter functions; modules never maintain private shadow copies.
120. **Single-Responsibility Modules** — Each module has one clear reason to change (e.g., `input/keyboard.js` only handles keydown events; `serialization.js` only handles data formats).

## Miscellaneous
109. **Spawn Component at Center** — Pressing 1-6 or clicking nav items spawns component at screen center.
110. **Auto-Offset on Spawn Collision** — If spawn position overlaps existing component, auto-offsets to avoid stacking.
111. **Smart Spawn Grid Alignment** — Components spawn snapped to half-grid.
112. **Label Box Resize** — Bottom-right triangular handle; snap to half-grid; minimum size enforced.
113. **Label Editor Inline** — Positioned over the component; scaled with camera zoom.
114. **Escape to Deselect** — Pressing Escape deselects all, clears pins, wires, and closes open modals.
115. **Keyboard Shortcuts Disabled in Inputs** — Global keydown handler skips when an INPUT or TEXTAREA is focused.
116. **Simulation Tick on Wire Creation** — If simulation is running, immediately evaluates new wire connections.
117. **roundRect Polyfill** — Fallback implementation for `CanvasRenderingContext2D.roundRect()`.
