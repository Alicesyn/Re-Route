---
name: reroute-ui-components
description: >-
  Use this skill whenever developing, styling, or debugging UI components, Leaflet maps (MapView.tsx),
  dnd-kit drag-and-drop sortables, tabs, modals, or theme styles (dark/light) in RE-Route.
---

# RE-Route UI Components & Design System

This skill guides creating and styling user interfaces, interactive maps, and drag-and-drop elements across RE-Route.

## Design Philosophy & Tokens

- **Tailwind CSS System**: Custom palette configured in `tailwind.config.js` with semantic tokens (`primary`, `surface`, etc.).
- **Dark Mode**: Always implement dual-theme styling using `dark:` Tailwind variants.
- **Micro-Animations & Transitions**: Use subtle framer-motion animations and CSS transitions (`transition-all duration-200`) for interactive hover and press states.
- **Icons**: Use `lucide-react` icons exclusively for visual consistency.

---

## Component Guidelines

### 1. Place Cards & Lists (`src/components/trip-builder/`)
- **`PlaceList.tsx`**:
  - Uses a 4-tab filter structure: **Active `(N)`**, **Unassigned `(N)`**, **Excluded `(N)`**, and **All `(N)`**.
  - Excluded tab includes an informational banner and a "Re-enable All" bulk action button.
  - Implement tailored empty states for each tab so the interface never looks broken.
- **`PlaceItem.tsx`**:
  - Includes an Exclude/Include toggle button (`Eye` / `EyeOff`) with tooltip.
  - When excluded (`place.isDisabled`): display muted background, dashed border, and "Excluded" badge; hide the day picker to prevent accidental assignment.
  - Editable descriptions: inline textarea with auto-resize and Enter/Escape listeners.
  - Duration editor: numeric input with validation and quick-save.
  - Drag handle: uses `GripVertical` with `@dnd-kit/sortable`. Always set `activationConstraint: { distance: 5 }` on pointer sensors to allow clicks inside child buttons.

### 2. Leaflet Map (`src/components/map/MapView.tsx`)
- Always render map within `<div className="h-full w-full relative z-0">`.
- Use custom colored route polylines and numbered stop icons (`getStopIcon`).
- Filter markers so excluded places (`!p.isDisabled`) do not clutter the active route visualization.
- Use `MapBounds` to dynamically re-fit the viewport when stops change.

### 3. Schedule Timeline (`src/components/schedule/DailySchedule.tsx`)
- Displays chronologically sequenced day cards with travel segments, visit time, and arrival/departure buffers.
- Manual stop reordering uses `@dnd-kit` vertical sorting and updates `manualSequence` in the store.
- Displays time conflict warnings (`AlertTriangle`) when visit durations exceed daylight hours or flight buffer limits.

### 4. Modals & Dialogs (`src/components/layout/`)
- Modals (`ApiBudgetModal`, `CategorySettingsModal`, `ImportModal`, `LoadTripModal`) use `<AnimatePresence>` from `framer-motion` for backdrop blur and smooth scale-in.
- Ensure all modal inputs have accessible labels, dark mode styles, and click-outside / Escape dismissal.
