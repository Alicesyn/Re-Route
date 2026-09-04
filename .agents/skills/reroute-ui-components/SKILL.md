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
- **Mobile Safe Areas**: Support notch and navigation bar insets using `.safe-pt`, `.safe-pb`, `.safe-pl`, and `.safe-pr` with `viewport-fit=cover`.
- **List Performance**: Use `.content-auto` (`content-visibility: auto; contain-intrinsic-size: ...`) on repeated list items (`PlaceItem`, schedule cards) to avoid rendering off-screen DOM nodes.

---

## Component Guidelines

### 1. Place Cards & Lists (`src/components/trip-builder/`)
- **`PlaceList.tsx`**:
  - Uses a 4-tab filter structure: **Active `(N)`**, **Unassigned `(N)`**, **Excluded `(N)`**, and **All `(N)`**.
  - Excluded tab includes an informational banner and a "Re-enable All" bulk action button.
  - Implement tailored empty states for each tab so the interface never looks broken.
  - Wrap cards in `.content-auto` for smooth scrolling performance with large itineraries.
- **`PlaceItem.tsx`**:
  - Category pill: Dynamically sized (`w-auto inline-flex`), emoji placed on the left, and custom category colors applied.
  - Price estimate badge: Clearly displays currency or "Free" with emerald badge styling.
  - Reservation indicator: Shows whether reservations are required/recommended, booking window (e.g., "1 month in advance"), and reservation link.
  - Includes an Exclude/Include toggle button (`Eye` / `EyeOff`) with tooltip.
  - When excluded (`place.isDisabled`): display muted background, dashed border, and "Excluded" badge; hide the day picker to prevent accidental assignment.
  - Editable descriptions: inline textarea with auto-resize and Enter/Escape listeners. Preserves `descriptionSource: "user"` to prevent automated overrides.
  - Drag handle & Sensors: In `@dnd-kit`, **never** use a plain `PointerSensor` for mobile lists as it hijacks page scrolling. Always combine `MouseSensor` (`distance: 8`) with `TouchSensor` (`delay: 200, tolerance: 6`).

### 2. Leaflet Map (`src/components/map/MapView.tsx`)
- Lazy-load `MapView` dynamically (`React.lazy`) with a fallback skeleton to avoid bloating the initial page bundle (Leaflet + CSS is ~170 kB).
- Always render map within `<div className="h-full w-full relative z-0">`.
- Desktop vs Mobile Layout: On desktop (`lg:`), display as a fixed side panel alongside Trip Settings. On mobile/tablet (`<lg`), provide an expandable "Show Route Map" toggle button to prevent excessive vertical scrolling.
- Filter markers so excluded places (`!p.isDisabled`) do not clutter the active route visualization.
- Use `MapBounds` to dynamically re-fit the viewport when stops change.

### 3. Schedule Timeline (`src/components/schedule/DailySchedule.tsx`)
- Displays chronologically sequenced day cards with travel segments, visit time, and arrival/departure buffers.
- Manual stop reordering uses `@dnd-kit` vertical sorting with `MouseSensor` and `TouchSensor` (`delay: 200, tolerance: 6`).
- Displays reservation warning badges and specific must-try highlights directly on stop cards.
- Lazy-load `EditPlaceModal` with `React.lazy` and wrap in `<Suspense fallback={null}>`.
- Displays time conflict warnings (`AlertTriangle`) when visit durations exceed daylight hours or flight buffer limits.

### 4. Modals & Dialogs (`src/components/layout/`)
- All heavy modals (`ApiBudgetModal`, `CategorySettingsModal`, `ImportModal`, `LoadTripModal`, `EditPlaceModal`) **must be lazy-loaded** using `React.lazy` and rendered conditionally inside `<React.Suspense fallback={null}>`.
- Modals use `<AnimatePresence>` from `framer-motion` for backdrop blur and smooth scale-in.
- Ensure all modal inputs have accessible labels, dark mode styles, and click-outside / Escape dismissal.
