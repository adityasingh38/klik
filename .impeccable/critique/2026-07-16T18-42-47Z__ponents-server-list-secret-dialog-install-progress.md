---
target: Klik renderer redesign (ServerListView, SecretPromptDialog, InstallProgressView)
total_score: 23
p0_count: 2
p1_count: 3
timestamp: 2026-07-16T18-42-47Z
slug: ponents-server-list-secret-dialog-install-progress
---
Method: dual-agent (A: a57645275aa77b3f9 · B: afc4a44abac348b3b)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Good spinner/badge/ticker feedback; the one "you're done" payoff moment (confetti) is invisible |
| 2 | Match System / Real World | 2 | Copper's stated meaning ("commitment/switch-closing") is diluted by using it for passive hover/focus too |
| 3 | User Control and Freedom | 3 | Cancel/Done present; no way to abort a running install once started |
| 4 | Consistency and Standards | 2 | Two competing button languages: plain `Button` vs `ShimmerButton` for primary actions |
| 5 | Error Prevention | 2 | Uninstall fires immediately, zero confirmation on a destructive action |
| 6 | Recognition Rather Than Recall | 4 | Selected count, per-row description, per-step status all visible in place |
| 7 | Flexibility and Efficiency | 2 | No select-all, no keyboard row nav, no verified-only filter, substring-only search |
| 8 | Aesthetic and Minimalist Design | 1 | Five purely decorative motion systems added zero information to a "control panel" app |
| 9 | Error Recovery | 2 | Clear failure badge/message, but no retry affordance |
| 10 | Help and Documentation | 2 | Inline env-var descriptions are good; nothing explains "MCP server"/"client" for a newcomer |
| **Total** | | **23/40** | **Acceptable — significant improvements needed before users are happy** |

## Anti-Patterns Verdict

**LLM assessment (Assessment A):** This is product-slop, not brand-slop. Every headline addition (dot-pattern bg, MagicCard spotlight, BorderBeam, ShimmerButton, confetti) is a marketing-site attention-capture pattern grafted onto a tool whose own design comment says it should read like "a switch closing." The direction itself — not just the execution — is likely miscalibrated for a Linear/Raycast/Stripe-register dev tool.

**Deterministic scan (Assessment B):** `detect.mjs` ran clean (exit 0, zero findings) against the renderer source. Manual ban-list check found what the automated scan missed:
- **Tiny uppercase tracked eyebrow labels** — 2 matches: `ServerListView.tsx:84` ("Install into") and `:111` ("MCP servers"). Textbook match for a banned pattern the LLM review didn't flag.
- **Text-overflow risk** — 2 spots: `ServerListView.tsx:87-104` (client row, no `min-w-0`/truncate) and `InstallProgressView.tsx:73-76` (result row, no `min-w-0`/truncate) — inconsistent with the server row directly above, which does this correctly.
- **No purple/pink leaks in the live app** — both `BorderBeam` and `MagicCard` call sites correctly override Magic UI's stock defaults to copper. But the stock purple/pink (`#9E7AFF`, `#FE8BBB`, `#9c40ff`, and orb-mode `#6b21ef`) are still sitting in the component source as fallbacks for any prop not explicitly passed — latent risk, not a current bug.
- No side-stripe borders, gradient text, glassmorphism-by-default, hero-metric template, or identical card grids found — those bans are clean.

## Overall Impression

The functional core (task flow, decision count, memory load) was lean and well-controlled before this pass and still is. What's been added on top is decorative motion pulled from a component library built for landing pages, applied to a tool whose entire identity is restraint. The user's "not premium" reaction has a precise technical explanation: the app's single most emotionally-loaded moment — install completion — is exactly where the new "delight" effect (confetti) silently fails, so the flow's peak-end memory is dominated by an anticlimax, not by the reasonably solid middle.

## What's Working

1. **The base copper/graphite identity** (`globals.css:62-92`) — specific, not a generic shadcn default. This didn't need Magic UI to be distinctive and is the app's strongest asset.
2. **Skeleton loading + stale-cache banner** (`ServerListView.tsx:113-122`, `App.tsx:116-119`) — unglamorous, restrained, exactly the kind of polish that earns trust in a control-panel register.
3. **Progress bar + NumberTicker pairing** (`InstallProgressView.tsx:49-68`) — the one Magic UI addition correctly scoped to a real, monotonically-changing state rather than idle decoration.

## Priority Issues

**[P0] ShimmerButton shimmers and glows while disabled.**
`shimmer-button.tsx:60,62` hardcodes `animate-shimmer-slide`/`animate-spin-around` as unconditional infinite animations with no `disabled:` gate anywhere in the component. Both call sites (`ServerListView.tsx:166-176`, `SecretPromptDialog.tsx:58-68`) only dim opacity via consumer className. Why it matters: an animated "click me" signal on an unclickable button (0 servers selected, empty required secret) is a direct affordance violation, and it undercuts the exact "switch closing" commitment metaphor the design intent is built on.
Fix: gate the shimmer/spin classes on `:disabled` (e.g. `disabled:animate-none` in the component itself, not per-call-site), or drop ShimmerButton for these two CTAs in favor of the plain `Button` already used for Uninstall/Done.
Suggested command: `/impeccable polish`

**[P0] Confetti fires but is invisible — the flow's one payoff moment is broken.**
`InstallProgressView.tsx:42,46` nests `<Confetti>` inside the view's own small `relative flex flex-col gap-4` block with `absolute inset-0 size-full` — sized to that content box, not the viewport, so the burst clips almost instantly (confirmed live). Why it matters: this is the single moment engineered for delight in the entire app, silently non-functional — worse than not having it, since effort was spent for zero payoff, and it's exactly the flow's peak-end moment (see Overall Impression).
Fix: render `Confetti` through a portal or a fixed, viewport-sized overlay mounted at the `App.tsx` root — or, given the P1 register question below, cut it entirely.
Suggested command: `/impeccable polish`

**[P1] No distinct keyboard-focus indicator on the two primary CTAs.**
`shimmer-button.tsx:44-48` has zero `focus-visible:` styling, unlike every other interactive primitive in the app (`button.tsx:7`, `input.tsx:12`, `checkbox.tsx:11` all carry `focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50`). Because ShimmerButton is a raw custom `<button>` not built on the shared `buttonVariants`, "Get Your Klik" and "Continue" — the app's two most important actions — fall back to whatever bare UA outline the browser draws, with nothing distinguishing real keyboard focus from the decorative shimmer. A WCAG 2.4.7 gap, not just a taste issue.
Fix: either add the same focus-visible ring token used elsewhere directly to ShimmerButton's base classes, or don't special-case these two buttons away from `buttonVariants` at all.
Suggested command: `/impeccable audit`

**[P1] Server list traded density for a marketing-card treatment.**
The list went from a single bordered/divided row-list to individually-hoverable rounded `MagicCard`s with cursor-tracked radial gradients (`ServerListView.tsx:126-158`). Why it matters: this costs list density and scan speed — the actual value of a control panel — for a decorative return of zero information, and it overloads the copper accent to simultaneously mean "selected," "hovering," "verified," and "brand." For a catalog that can list dozens of servers, per-row pointer-tracking listeners and extra whitespace are a real, compounding cost.
Fix: revert to a tight list with a simple static `hover:bg-accent/10`, reserving copper exclusively for the selected/committed state per the app's own design intent.
Suggested command: `/impeccable quieter`

**[P1] Search-filter keystrokes replay the row entrance animation.**
Each row is wrapped in `BlurFade` keyed by `server.id` inside `filteredServers.map` (`ServerListView.tsx:123-159`); because the filtered list is recomputed every keystroke, any row leaving/re-entering the matched set unmounts/remounts and replays its 300ms blur+offset entrance. Why it matters: search-as-you-type is the single fastest, most-repeated interaction in the app — attaching a replaying entrance animation to it is friction on exactly the interaction that should feel instant.
Fix: gate `BlurFade` to first-paint only (skip replay on filter-driven remounts), or drop the per-row animation for the filtered case.
Suggested command: `/impeccable optimize`

**[P2] Uppercase tracked "eyebrow" section labels.**
`ServerListView.tsx:84` ("Install into") and `:111` ("MCP servers") are a direct match for a named AI-slop scaffolding tell (tiny uppercase + tracked labels used as default section headers), caught by the deterministic ban-list pass.
Fix: restyle as a normal small-caps-free label, or fold into a proper section heading treatment.
Suggested command: `/impeccable typeset`

**[P2] Long text can overflow two row layouts.**
`ServerListView.tsx:87-104` (client row) and `InstallProgressView.tsx:73-76` (result row) lack `min-w-0`/`truncate`, unlike the server row directly above (`ServerListView.tsx:140`, which does this correctly) — inconsistent handling of the same problem in the same file.
Fix: add `min-w-0` to the flex containers and `truncate` to the long-text spans, matching the pattern already used correctly elsewhere.
Suggested command: `/impeccable adapt`

**[P3] No `prefers-reduced-motion` accommodation anywhere.**
None of `BorderBeam`, `ShimmerButton`, the progress-bar sweep, or `DotPattern` check `useReducedMotion()`, and there's no CSS `@media (prefers-reduced-motion: reduce)` guard in `globals.css`. A concrete, software-level accessibility gap for motion-sensitive users on an OS that exposes this exact setting.
Fix: wrap each decorative animation in a reduced-motion check with a static fallback.
Suggested command: `/impeccable harden`

**[P3] Destructive uninstall has zero confirmation.**
`ServerListView.tsx:151-154` fires `onUninstall` immediately on click. One misclick permanently removes an install. Pre-existing behavior, not introduced by this pass, but worth naming since it's a real error-prevention gap.
Suggested command: `/impeccable harden`

## Persona Red Flags

**Alex (impatient power user)**
- Sees a glowing, shimmering "Get Your Klik" before selecting anything — wastes a beat parsing "why is this animating if I can't click it" (P0).
- Watches rows blur-fade in/out on every keystroke that changes the match set — feels laggier than the instant filter he expects from Raycast-adjacent tools (P1).
- No select-all, no keyboard row navigation, no verified-only filter — installing 5+ servers means clicking every checkbox individually.
- Gapped MagicCard rows show fewer servers per scroll than the original bordered list — more scrolling to scan a growing catalog, directly opposed to his priority of speed.

**Sam (accessibility-dependent user)**
- Zero `prefers-reduced-motion` support anywhere — four independent infinite-loop animations with no OS-level off-switch (P3).
- MagicCard's spotlight glow is mouse-position-driven with no keyboard/focus-visible equivalent — a keyboard user gets none of the added "richness"; the enhancement is exclusively for mouse users.
- The two primary CTAs have no distinct focus-visible ring (P1) — a real keyboard-navigation gap on the app's most important actions.
- One correct thing: all status badges (Verified/Installed/destructive) pair color with a text label — status isn't conveyed by color alone.

## Minor Observations

- `magic-card.tsx` imports and calls `next-themes`' `useTheme()` despite Klik having exactly one fixed dark theme and no `ThemeProvider` in the tree — dead code path, evidence of an un-adapted copy-paste from Magic UI's Next.js-oriented source.
- `ShimmerButton`'s own defaults (white shimmer, 100px pill radius, black background) are overridden at every call site — it's being used as a raw effect primitive, not an actual reusable button, which is part of why it visually clashes with the plain shadcn `Button` used elsewhere.
- `DotPattern` computes a full grid of individual `motion.circle` elements plus a resize listener for an effect confirmed nearly imperceptible against `#17191b` — real DOM/JS cost for near-zero visual return.
- Stock Magic UI purple/pink defaults (`#9E7AFF`, `#FE8BBB`, `#9c40ff`, `#6b21ef`) sit unused-but-present in `magic-card.tsx`/`border-beam.tsx` as fallbacks — not currently triggered, but a landmine for the next person who adds a call site without overriding color props.

## Questions to Consider

1. If the app's single most emotionally-loaded moment (install completion) is the one place a Magic UI effect was added, and it's the one that's silently broken — is the fix more polish on that effect, or is confetti simply the wrong idea for something that should feel like "a switch closing"?
2. Every addition here is drawn from a component library named for what marketing sites want. Would this pass look different — and better — if the brief had been "make this feel like flipping a well-machined switch" instead of "add Magic UI components"?
3. Copper's job, per the app's own design comment, is to mark commitment. This pass now uses it for hover glow, focus glow, and passive badges too. If everything is copper, is anything still copper?
