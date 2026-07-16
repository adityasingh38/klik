# Contributing to Klik

Thanks for considering a contribution. Klik is a small, focused tool — keep changes scoped and this stays easy to review.

## Getting set up

```bash
git clone https://github.com/adityasingh38/klik.git
cd klik
npm install
npm run dev
```

Before opening a PR:

```bash
npm run typecheck
npm test
```

Both must pass — CI runs the same two commands on every PR.

## Project layout

- `src/main/` — Electron main process: registry client, client adapters (`clients/`), install logic (`install/`), IPC handlers.
- `src/renderer/` — the React UI. `components/ui/` is shadcn/ui + Magic UI primitives (added via `npx shadcn@latest add ...`, not hand-written); everything else in `components/` is app-specific.
- `src/preload/` — the context-bridge API surface exposed to the renderer as `window.klik`.
- `src/shared/` — types shared between main and renderer.
- `test/main/` — unit tests (vitest) for main-process logic. The renderer currently has no automated tests; changes there are verified manually via `npm run dev`.

## Adding a new target client

Each supported client (Claude Desktop, Cursor, VS Code) is a self-contained adapter in `src/main/clients/`, implementing the shared `ClientAdapter` interface (`src/main/clients/types.ts`). A new client is a new adapter file plus a registration line in `src/main/ipc/handlers.ts` — not a rewrite of existing ones. Look at `vscode.ts` or `cursor.ts` as a template.

## Style

- No new Tailwind config file — this project uses Tailwind v4's CSS-first `@theme` block in `src/renderer/src/globals.css`. Add tokens there, not in a `tailwind.config.js`.
- Stay within the existing copper/graphite palette (`--primary`, `--background`, etc. in `globals.css`). Don't introduce new colors without a reason tied to a real semantic state (error, success, etc.).
- Keep decorative motion scoped and purposeful — this app is a control panel, not a landing page. If you're adding an animation, ask whether it conveys real state or is just decoration.

## Reporting bugs / requesting features

Use the issue templates — they ask for the specific context that makes an issue actionable (repro steps for bugs, use case for features) instead of a blank text box.
