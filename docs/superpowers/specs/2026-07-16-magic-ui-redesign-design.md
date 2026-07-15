# Klik Magic UI redesign — design

## Goal

Make Klik's renderer UI (`src/renderer/src`) visually richer using Magic UI components,
while keeping the existing copper/graphite dark identity and control-panel feel. Full
redesign across all three screens, but with animation/decoration scoped narrowly rather
than applied everywhere (see Guardrails).

## Current state (baseline)

- Single-page app, no router. `App.tsx` switches between three views via a `ViewMode`
  state: `list` | `secrets` | `progress`.
- `ServerListView.tsx` — searchable list of MCP servers, checkboxes for target clients,
  install/uninstall actions.
- `SecretPromptDialog.tsx` — modal form for required env vars/secrets before install.
- `InstallProgressView.tsx` — progress bar + spinner + per-server/per-client result rows.
- Theme: fixed dark only (no light mode), copper accent `#e0873f`, graphite
  background/card tones, `0.25rem` radius, Space Grotesk/Inter/JetBrains Mono. Defined as
  a Tailwind v4 CSS-first `@theme inline` block in `globals.css`.
- shadcn/ui `base-nova` style already in use (`components.json`), components live in
  `src/renderer/src/components/ui/`.
- No motion library installed yet (only `tw-animate-css`, CSS-only).

## Approach

Add Magic UI as an accent layer on top of the existing shadcn setup — same install
mechanism (`npx shadcn@latest add "https://magicui.design/r/<name>.json"`, via the
existing `components.json`), plus the `motion` package as the one new runtime
dependency Magic UI's animated components need.

Rejected alternative: heavy ambient treatment (particles/animated backgrounds across the
whole shell). Dropped because it risks the generic "AI-product slop" look explicitly
flagged as a dislike in the user's design taste notes, and constant background motion in
a small Electron window is wasted GPU/battery cost for a utility tool that's open most of
the day.

## Screens

### Global shell (`App.tsx`)

- `DotPattern` (Magic UI) behind the main content, very low opacity, graphite-toned —
  adds depth without competing with content.
- View transitions (list ↔ secrets ↔ progress) get a `motion` fade+slide wrap instead of
  an instant swap.

### `ServerListView`

- List rows: `BlurFade` staggered entrance on initial load and on search-filter changes.
- Server card: swap plain `Card` for Magic UI `MagicCard` (cursor-follow spotlight
  border), tinted copper.
- Search `Input` focus ring: `BorderBeam` traveling copper glow.
- Primary "Install" CTA: `ShimmerButton` (or `RippleButton`) — copper shimmer. This is the
  one signature/premium-feeling effect on this screen, deliberately not repeated on
  every button.

### `SecretPromptDialog`

- Dialog mount/unmount: `motion` scale+blur transition (kept minimal — a modal shouldn't
  carry heavy decoration).
- Submit button: same `ShimmerButton` treatment as the install CTA, for consistency
  rather than introducing a new effect.

### `InstallProgressView`

- Linear `Progress` bar replaced with a `motion`-driven shimmer-fill version (animated
  width + gradient sweep) — stays linear, doesn't switch to a circular/dial style, to
  match the existing control-panel layout.
- Per-server result rows: `BlurFade` reveal as each result comes in.
- Summary count ("N of M installed"): Magic UI `NumberTicker`.
- All-succeeded end state: one `Confetti` burst, copper/graphite-tinted (not default
  rainbow) — a real completion moment, not decoration for its own sake.

## Guardrails (from design taste notes)

- No purple/generic-AI gradients anywhere — stay strictly within the existing
  copper/graphite palette.
- Signature glow/shimmer effects limited to primary CTAs and hover/focus states, not
  scattered across every element.
- Prefer the spring-based easing Magic UI/`motion` default to over linear easing.
- Confetti/celebration effect only fires on a genuine completion event (all installs
  succeeded), not as generic flourish.

## Out of scope

- No light mode / theme toggle — app stays fixed dark.
- No new screens, routes, or app-level state beyond what already exists in
  `ViewMode`.
- No changes to install/uninstall business logic, IPC bridge (`klikApi.ts`), or backend
  behavior — this is a visual/animation-only pass.

## Testing

- Manual verification via `npm run dev`: exercise all three screens (search/filter,
  install with a required secret, install without one, an install that fails) and confirm
  animations render correctly in the actual Electron window, not just visually inspected
  in isolation.
- `npm run typecheck` and `npm test` must still pass after the change (no functional
  regressions expected, but the dialog/progress components are being touched).
