# CLAUDE.md — Klik

## Fast start

- **Stack:** Electron desktop app (`electron.vite.config.ts`), React + Tailwind v4 + shadcn/ui
  (`base-nova` style, `@base-ui/react` primitives). Package name `klikmcp`.
- **Dev:** `npm run dev`   **Build:** `npm run build` (Windows: `npm run build:win`)
- **Test:** `npm test`   **Typecheck:** `npm run typecheck`
- **State (2026-07-16):** on branch `feature/v1-implementation`; renderer UI rewritten from
  `@astryxdesign/core` to Tailwind+shadcn (custom copper/graphite palette — see `globals.css`).

## Notes

- Renderer UI uses shadcn/ui components exclusively (`src/renderer/src/components/ui/`), added
  via `npx shadcn@latest add <component>`. `components.json` config is manual — the CLI's
  framework auto-detect doesn't understand electron-vite's multi-target config, so `npx shadcn
  init` fails; components still add correctly once `components.json` exists.
- `@` import alias points at `src/renderer/src/*` — configured in three places that must stay in
  sync: `electron.vite.config.ts` (renderer `resolve.alias`), `tsconfig.web.json`, and root
  `tsconfig.json` (the CLI reads the root config for alias resolution, not the referenced
  sub-configs, even though the root file has `"files": []` and doesn't compile anything itself).
- `@astryxdesign/core` was removed (2026-07-16) — Klik no longer depends on Astryx, unlike other
  projects in this workspace.
