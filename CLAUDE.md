# CLAUDE.md — Klik

## Fast start

- **Stack:** Electron desktop app (`electron.vite.config.ts`), React + `@astryxdesign/core`.
  Package name `klikmcp`.
- **Dev:** `npm run dev`   **Build:** `npm run build` (Windows: `npm run build:win`)
- **Test:** `npm test`   **Typecheck:** `npm run typecheck`
- **State (2026-07-15):** on branch `feature/v1-implementation`; last commit `feat: add renderer
  server list view with search, client toggle, and checkbox selection` (3e63c2f). Live project
  this month.

## Notes

- Depends on `@astryxdesign/core`. A shared install also exists at `E:\Projects\node_modules`;
  Node resolution walks up, so do not be surprised to see it resolve outside this folder.
