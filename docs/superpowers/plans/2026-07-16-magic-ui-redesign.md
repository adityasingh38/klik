# Klik Magic UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give Klik's renderer (all three screens: server list, secret dialog, install progress) a visually richer treatment using Magic UI components layered on top of the existing shadcn/copper-graphite setup, without changing any install/uninstall business logic.

**Architecture:** Magic UI components are added the same way existing shadcn/ui components were added — via the shadcn CLI pointed at the `@magicui` registry — landing in `src/renderer/src/components/ui/`. One new runtime dependency family (`motion`, `next-themes`, `canvas-confetti`) backs the animated components. Each of the three screens gets its own task wiring specific Magic UI components into its existing JSX; a final task adds the shared app-shell background/transition and does end-to-end manual verification.

**Tech Stack:** React 19, Tailwind v4 (CSS-first `@theme`), shadcn/ui (`base-nova` style), Magic UI (registry components + `motion` animation), Electron/electron-vite.

## Global Constraints

- Tailwind config is CSS-first only (`src/renderer/src/globals.css`, `@theme inline` block) — no `tailwind.config.js`/`.ts` file exists or should be created.
- Palette stays strictly copper/graphite (`--primary: #e0873f`, graphite backgrounds) — never use Magic UI's purple/pink defaults (`#9E7AFF`/`#FE8BBB`, `#9c40ff`) as-is; override every color prop.
- App stays fixed dark, single theme — no light mode, no theme toggle, no `.dark` class usage.
- No changes to `src/renderer/src/api/klikApi.ts`, `src/main/**`, or any IPC/install logic — visual/animation only.
- Signature glow/shimmer effects (`BorderBeam`, `ShimmerButton`) are limited to primary CTAs and focus states — not applied to every element.
- `npm run typecheck` must pass after every task. `npm test` (main-process tests under `test/main/**`) must keep passing unchanged — none of this plan touches main-process code.
- `cn` continues to come from the existing `@/lib/utils` (`clsx` + `tailwind-merge`) — Magic UI's registry files already import from that exact path, no changes needed there.

---

### Task 1: Install Magic UI components and dependencies

**Files:**
- Create (via CLI): `src/renderer/src/components/ui/dot-pattern.tsx`, `blur-fade.tsx`, `magic-card.tsx`, `border-beam.tsx`, `shimmer-button.tsx`, `number-ticker.tsx`, `confetti.tsx`
- Modify: `package.json` (add `motion`, `next-themes`, `canvas-confetti`, `@types/canvas-confetti`)
- Modify: `src/renderer/src/globals.css` (add `shimmer-slide`/`spin-around` animation keyframes needed by `ShimmerButton`)

**Interfaces:**
- Produces: `DotPattern` (props: `width`, `height`, `x`, `y`, `cx`, `cy`, `cr`, `className`, `glow`), `BlurFade` (props: `children`, `className`, `duration`, `delay`, `offset`, `direction`, `inView`, `inViewMargin`, `blur`), `MagicCard` (props: `children`, `className`, `gradientSize`, `gradientFrom`, `gradientTo`, `gradientColor`, `gradientOpacity`, `mode`), `BorderBeam` (props: `className`, `size`, `duration`, `delay`, `colorFrom`, `colorTo`, `reverse`, `initialOffset`, `borderWidth`), `ShimmerButton` (props: extends `button`, plus `shimmerColor`, `shimmerSize`, `borderRadius`, `shimmerDuration`, `background`, `className`, `children`), `NumberTicker` (props: `value`, `startValue`, `direction`, `delay`, `decimalPlaces`, `className`), `Confetti` + `ConfettiRef` (imperative `.fire(options?)`, props: `options`, `globalOptions`, `manualstart`, `className`) — all importable from `@/components/ui/<name>`, used by Tasks 2-5.

- [ ] **Step 1: Install the Magic UI components via the shadcn CLI**

Run:
```bash
npx shadcn@latest add --yes @magicui/dot-pattern @magicui/blur-fade @magicui/magic-card @magicui/border-beam @magicui/shimmer-button @magicui/number-ticker @magicui/confetti
```
Expected: CLI reports each of the 7 components added successfully, creating the files under `src/renderer/src/components/ui/`.

- [ ] **Step 2: Verify the files exist**

Run:
```bash
node -e "['dot-pattern','blur-fade','magic-card','border-beam','shimmer-button','number-ticker','confetti'].forEach(f => { if (!require('fs').existsSync(`src/renderer/src/components/ui/${f}.tsx`)) throw new Error(f + ' missing') }); console.log('all present')"
```
Expected: `all present`

- [ ] **Step 3: Ensure runtime dependencies are declared**

Open `package.json` and confirm/add these entries under `"dependencies"` (the CLI may have already added some — this step just guarantees all four are present with these versions):

```json
    "canvas-confetti": "^1.9.3",
    "motion": "^12.23.12",
    "next-themes": "^0.4.6",
```

And under `"devDependencies"`:

```json
    "@types/canvas-confetti": "^1.9.0",
```

- [ ] **Step 4: Install**

Run:
```bash
npm install
```
Expected: exits 0, `node_modules/motion`, `node_modules/next-themes`, `node_modules/canvas-confetti` present.

- [ ] **Step 5: Add the Tailwind keyframes `ShimmerButton` needs**

`ShimmerButton`'s markup uses the Tailwind utility classes `animate-shimmer-slide` and `animate-spin-around`, which aren't defined anywhere in Klik yet. Add them to the existing `@theme inline { ... }` block in `src/renderer/src/globals.css` (Tailwind v4 allows `@keyframes` nested inside `@theme`, same pattern Magic UI's own site uses).

In `src/renderer/src/globals.css`, inside the existing `@theme inline { ... }` block, right after the last `--radius-lg: calc(var(--radius) + 2px);` line, add:

```css
  --animate-shimmer-slide: shimmer-slide var(--speed) ease-in-out infinite alternate;
  --animate-spin-around: spin-around calc(var(--speed) * 2) infinite linear;

  @keyframes shimmer-slide {
    to {
      transform: translate(calc(100cqw - 100%), 0);
    }
  }

  @keyframes spin-around {
    0% {
      transform: translateZ(0) rotate(0);
    }
    15%,
    35% {
      transform: translateZ(0) rotate(90deg);
    }
    65%,
    85% {
      transform: translateZ(0) rotate(270deg);
    }
    100% {
      transform: translateZ(0) rotate(360deg);
    }
  }
```

- [ ] **Step 6: Typecheck**

Run:
```bash
npm run typecheck
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/renderer/src/components/ui/dot-pattern.tsx src/renderer/src/components/ui/blur-fade.tsx src/renderer/src/components/ui/magic-card.tsx src/renderer/src/components/ui/border-beam.tsx src/renderer/src/components/ui/shimmer-button.tsx src/renderer/src/components/ui/number-ticker.tsx src/renderer/src/components/ui/confetti.tsx src/renderer/src/globals.css
git commit -m "feat: add Magic UI components and shimmer keyframes"
```

---

### Task 2: App shell — background pattern and view transitions

**Files:**
- Modify: `src/renderer/src/App.tsx`

**Interfaces:**
- Consumes: `DotPattern` from `@/components/ui/dot-pattern` (Task 1). `motion`, `AnimatePresence` from `motion/react`.
- Produces: no new exports — `App.tsx` remains the default export used by `src/renderer/src/main.tsx`.

- [ ] **Step 1: Add imports**

In `src/renderer/src/App.tsx`, add these two imports after the existing `React` import (line 1):

```tsx
import { AnimatePresence, motion } from 'motion/react'
import { DotPattern } from '@/components/ui/dot-pattern'
```

- [ ] **Step 2: Wrap the app in a relatively-positioned shell with the dot background**

Replace the `return` statement (currently lines 98-137) with:

```tsx
  return (
    <div className="relative min-h-screen overflow-hidden">
      <DotPattern className="text-border/25" />
      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
        <h1 className="font-heading text-2xl font-bold">Klik</h1>

        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex w-full flex-col gap-4"
            >
              {fromCache && (
                <Alert>
                  <AlertTitle>Showing cached data — could not reach the registry.</AlertTitle>
                </Alert>
              )}
              <ServerListView
                servers={servers}
                isLoadingServers={isLoadingServers}
                clients={clients}
                installedServerIds={installedServerIds}
                selectedServerIds={selectedServerIds}
                onChangeSelectedServerIds={setSelectedServerIds}
                selectedClientIds={selectedClientIds}
                onChangeSelectedClientIds={setSelectedClientIds}
                onInstall={startInstall}
                isInstalling={isInstalling}
                onUninstall={handleUninstall}
              />
            </motion.div>
          )}

          {view === 'secrets' && pendingSecretServerIds.length > 0 && (
            <motion.div
              key="secrets"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <SecretPromptDialog
                server={servers.find((s) => s.id === pendingSecretServerIds[0])!}
                onSubmit={handleSecretsSubmit}
                onCancel={() => setView('list')}
              />
            </motion.div>
          )}

          {view === 'progress' && (
            <motion.div
              key="progress"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <InstallProgressView results={results} isInstalling={isInstalling} onDone={() => setView('list')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`
Expected: Klik window opens showing the server list with a faint dot-pattern behind the content; switching between list/secrets/progress (e.g. select a server needing a secret and click "Get Your Klik") cross-fades instead of hard-cutting.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: add dot-pattern background and view transitions to app shell"
```

---

### Task 3: Server list — focus glow, card list, shimmer CTA

**Files:**
- Modify: `src/renderer/src/components/ServerListView.tsx`

**Interfaces:**
- Consumes: `MagicCard` from `@/components/ui/magic-card`, `BorderBeam` from `@/components/ui/border-beam`, `BlurFade` from `@/components/ui/blur-fade`, `ShimmerButton` from `@/components/ui/shimmer-button` (all Task 1).
- Produces: `ServerListView` keeps its existing exported props interface (`ServerListViewProps`) unchanged — no consumer-facing signature change, so `App.tsx` (Task 2) needs no further edits.

- [ ] **Step 1: Add imports**

In `src/renderer/src/components/ServerListView.tsx`, add after the existing `cn` import (line 7):

```tsx
import { MagicCard } from '@/components/ui/magic-card'
import { BorderBeam } from '@/components/ui/border-beam'
import { BlurFade } from '@/components/ui/blur-fade'
import { ShimmerButton } from '@/components/ui/shimmer-button'
```

- [ ] **Step 2: Track search-input focus state**

After the existing `const [search, setSearch] = useState('')` line (line 38), add:

```tsx
  const [isSearchFocused, setIsSearchFocused] = useState(false)
```

- [ ] **Step 3: Wrap the search input with a focus-triggered border beam**

Replace the existing `<Input ... />` block (lines 66-71) with:

```tsx
      <div className="relative rounded-lg">
        <Input
          placeholder="Search MCP servers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          aria-label="Search MCP servers"
        />
        {isSearchFocused && <BorderBeam size={40} duration={4} colorFrom="#e0873f" colorTo="#f2c98c" />}
      </div>
```

- [ ] **Step 4: Restructure the server list into a gapped stack of glowing cards**

Replace the whole "MCP servers" block (currently lines 100-145, the `<div className="flex flex-col gap-1">...MCP servers...</div>` container) with:

```tsx
      <div className="flex flex-col gap-1">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">MCP servers</p>
        <div className="flex flex-col gap-2">
          {isLoadingServers && servers.length === 0
            ? Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2">
                  <Skeleton className="size-4 rounded-[4px]" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))
            : filteredServers.map((server, index) => {
                const isInstalled = installedServerIds.includes(server.id)
                return (
                  <BlurFade key={server.id} delay={index * 0.03} duration={0.3} direction="up">
                    <MagicCard
                      className="rounded-md"
                      gradientColor="#2c2521"
                      gradientOpacity={0.5}
                      gradientFrom="#e0873f"
                      gradientTo="#f2c98c"
                    >
                      <div className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2 has-[[data-checked]]:bg-accent">
                        <label className="flex min-w-0 flex-1 items-center gap-3">
                          <Checkbox
                            checked={selectedServerIds.includes(server.id)}
                            onCheckedChange={(checked: boolean) => toggleServer(server.id, checked)}
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="text-sm">{server.title}</span>
                            <span className="truncate text-xs text-muted-foreground">{server.description}</span>
                          </div>
                        </label>
                        <div className="flex shrink-0 items-center gap-2">
                          {server.curation?.verified && (
                            <Badge className="bg-accent text-accent-foreground">Verified</Badge>
                          )}
                          {isInstalled && <Badge className="bg-success text-success-foreground">Installed</Badge>}
                          {isInstalled && (
                            <Button variant="destructive" size="sm" onClick={() => onUninstall(server.id)}>
                              Uninstall
                            </Button>
                          )}
                        </div>
                      </div>
                    </MagicCard>
                  </BlurFade>
                )
              })}
        </div>
      </div>
```

- [ ] **Step 5: Swap the primary CTA for a themed `ShimmerButton`**

Replace the closing `<Button disabled={...} onClick={onInstall}>Get Your Klik</Button>` block (lines 149-154) with:

```tsx
        <ShimmerButton
          disabled={selectedServerIds.length === 0 || selectedClientIds.length === 0 || isInstalling}
          onClick={onInstall}
          background="var(--primary)"
          shimmerColor="#eeeae2"
          shimmerDuration="2.5s"
          borderRadius="var(--radius-lg)"
          className="h-8 rounded-lg border-none px-3 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:pointer-events-none"
        >
          Get Your Klik
        </ShimmerButton>
```

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 7: Manual check**

Run: `npm run dev`
Expected: focusing the search box shows a traveling copper glow around it; each server row renders as its own rounded card that lights up a copper spotlight border on mouse hover, staggered fade-in on load; the "Get Your Klik" button has a continuous copper shimmer traveling around its edge and still respects its disabled state (no servers/clients selected, or install in progress).

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/components/ServerListView.tsx
git commit -m "feat: add border-beam, magic-card, and shimmer CTA to server list"
```

---

### Task 4: Secret prompt dialog — shimmer submit button

**Files:**
- Modify: `src/renderer/src/components/SecretPromptDialog.tsx`

**Interfaces:**
- Consumes: `ShimmerButton` from `@/components/ui/shimmer-button` (Task 1).
- Produces: `SecretPromptDialog` keeps its existing exported `SecretPromptDialogProps` unchanged.

- [ ] **Step 1: Add import**

In `src/renderer/src/components/SecretPromptDialog.tsx`, add after the existing `Button` import (line 12):

```tsx
import { ShimmerButton } from '@/components/ui/shimmer-button'
```

- [ ] **Step 2: Swap the Continue button**

Replace:
```tsx
          <Button disabled={!canContinue} onClick={() => onSubmit(values)}>
            Continue
          </Button>
```
with:
```tsx
          <ShimmerButton
            disabled={!canContinue}
            onClick={() => onSubmit(values)}
            background="var(--primary)"
            shimmerColor="#eeeae2"
            shimmerDuration="2.5s"
            borderRadius="var(--radius-lg)"
            className="h-8 rounded-lg border-none px-3 text-sm font-medium text-primary-foreground disabled:opacity-50 disabled:pointer-events-none"
          >
            Continue
          </ShimmerButton>
```

(The dialog's mount/unmount transition is intentionally left untouched — `DialogContent` in `src/renderer/src/components/ui/dialog.tsx` already animates in/out via its `data-open`/`data-closed` state classes; adding a second, competing motion-driven transition on top would fight that existing animation rather than complement it, and a modal should stay minimal per the design spec's guardrails.)

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 4: Manual check**

Run: `npm run dev`, select a server with a required secret, click "Get Your Klik".
Expected: the secret dialog opens as before; the "Continue" button shows the same copper shimmer as the list's CTA and stays disabled until all required fields are filled.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/components/SecretPromptDialog.tsx
git commit -m "feat: add shimmer treatment to secret dialog submit button"
```

---

### Task 5: Install progress — shimmer progress bar, row reveal, ticker, confetti

**Files:**
- Modify: `src/renderer/src/components/InstallProgressView.tsx`

**Interfaces:**
- Consumes: `motion` from `motion/react`, `BlurFade` from `@/components/ui/blur-fade`, `NumberTicker` from `@/components/ui/number-ticker`, `Confetti`/`ConfettiRef` from `@/components/ui/confetti` (Task 1).
- Produces: `InstallProgressView` keeps its existing exported `InstallProgressViewProps` unchanged.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `src/renderer/src/components/InstallProgressView.tsx` with:

```tsx
import React, { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BlurFade } from '@/components/ui/blur-fade'
import { NumberTicker } from '@/components/ui/number-ticker'
import { Confetti, type ConfettiRef } from '@/components/ui/confetti'
import type { InstallStepResult } from '../../../shared/types'

interface InstallProgressViewProps {
  results: InstallStepResult[]
  isInstalling: boolean
  onDone: () => void
}

export function InstallProgressView(props: InstallProgressViewProps): React.JSX.Element {
  const { results, isInstalling, onDone } = props
  const doneCount = results.filter((r) => r.status === 'done').length
  const total = results.length
  const pct = total > 0 ? (doneCount / total) * 100 : 0

  const confettiRef = useRef<ConfettiRef>(null)
  const hasFiredRef = useRef(false)
  const allSucceeded = total > 0 && !isInstalling && results.every((r) => r.status === 'done')

  useEffect(() => {
    if (allSucceeded && !hasFiredRef.current) {
      hasFiredRef.current = true
      confettiRef.current?.fire({
        particleCount: 80,
        spread: 70,
        colors: ['#e0873f', '#eeeae2', '#2c2521']
      })
    }
    if (!allSucceeded) {
      hasFiredRef.current = false
    }
  }, [allSucceeded])

  return (
    <div className="relative flex flex-col gap-4">
      <Confetti
        ref={confettiRef}
        manualstart
        className="pointer-events-none absolute inset-0 z-50 size-full"
      />

      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
        {isInstalling && (
          <motion.div
            className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary-foreground/40 to-transparent"
            animate={{ x: ['-100%', '400%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
          />
        )}
      </div>

      {total > 0 && (
        <p className="text-sm text-muted-foreground">
          <NumberTicker value={doneCount} className="text-primary tabular-nums" /> of {total} installed
        </p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((result, index) => (
          <BlurFade key={`${result.serverId}-${result.clientId}-${index}`} direction="up" duration={0.25}>
            <div className="flex items-center justify-between rounded-md bg-card px-3 py-2">
              <span className="text-sm">
                {result.serverId} &rarr; {result.clientId}
              </span>
              {result.status === 'running' && <Spinner className="size-4" />}
              {result.status === 'done' && (
                <div className="flex flex-col items-end gap-0.5">
                  <Badge className="bg-success text-success-foreground">Installed</Badge>
                  {result.message && (
                    <span className="text-xs text-muted-foreground">{result.message}</span>
                  )}
                </div>
              )}
              {result.status === 'error' && (
                <Badge variant="destructive">{result.message ?? 'Failed'}</Badge>
              )}
              {result.status === 'pending' && (
                <span className="text-xs text-muted-foreground">Waiting…</span>
              )}
            </div>
          </BlurFade>
        ))}
      </div>

      <div className="flex justify-end">
        <Button disabled={isInstalling} onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [ ] **Step 3: Manual check**

Run: `npm run dev`, select servers/clients, install.
Expected: progress bar fills smoothly with a traveling copper shimmer while installing; each per-server/client result row fades/lifts in as it arrives; the "N of M installed" count animates upward as results come in; once every result is `done`, a single copper/graphite-tinted confetti burst plays once (not on every re-render, not for a run that includes an error).

- [ ] **Step 4: Commit**

```bash
git add src/renderer/src/components/InstallProgressView.tsx
git commit -m "feat: add shimmer progress, row reveal, ticker, and completion confetti"
```

---

### Task 6: Full manual verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck and test suite**

Run:
```bash
npm run typecheck
npm test
```
Expected: both exit 0. `npm test` output shows only the existing `test/main/**` suites (no renderer tests exist), all passing — confirms this redesign touched nothing under `src/main`.

- [ ] **Step 2: Exercise every screen in the running app**

Run: `npm run dev` and walk through:
1. Search/filter the server list — rows re-animate in on filter change, hover shows the copper spotlight border on individual cards.
2. Select a server that requires a secret, click "Get Your Klik" — dialog opens, Continue button shimmers, stays disabled until required fields are filled, submitting proceeds to the progress view.
3. Select a server that requires no secret, click "Get Your Klik" — goes straight to the progress view.
4. Watch an install run to completion with no errors — confetti fires once at the end.
5. Trigger an install that includes a failure (e.g. an unreachable client) — confirm the error badge still renders correctly and confetti does NOT fire.
6. Click "Done" — returns to the list view with a cross-fade, not a hard cut.

Expected: all six behaviors match, no console errors in the Electron devtools, palette stays copper/graphite throughout (no purple/pink from Magic UI's defaults visible anywhere).

- [ ] **Step 3: Commit (if any fixes were needed)**

Only if Step 2 surfaced a fix — commit it with a message describing what was wrong, e.g.:
```bash
git add -A
git commit -m "fix: <describe the specific fix from manual verification>"
```
If no fixes were needed, skip this step — nothing to commit.

---

## Self-Review

**Spec coverage:** Global shell (dot pattern + transitions) → Task 2. ServerListView (BlurFade, MagicCard, BorderBeam, ShimmerButton) → Task 3. SecretPromptDialog (ShimmerButton, dialog transition explicitly reconsidered and dropped as redundant against the existing base-ui animation — documented inline in Task 4) → Task 4. InstallProgressView (shimmer progress, BlurFade rows, NumberTicker, Confetti) → Task 5. Dependency/keyframe setup → Task 1. Guardrails (no purple, scoped signature effects, spring easing) applied throughout via explicit color overrides on every Magic UI color prop. Testing section → Task 6.

**Placeholder scan:** No TBD/TODO markers; every step has complete, runnable code or an exact command with expected output.

**Type consistency:** `ServerListViewProps`, `SecretPromptDialogProps`, `InstallProgressViewProps` are all unchanged from their current shape (verified against the files read during planning), so `App.tsx` (Task 2) requires no signature updates to keep passing props to these three components. All new imports (`MagicCard`, `BorderBeam`, `BlurFade`, `ShimmerButton`, `NumberTicker`, `Confetti`/`ConfettiRef`, `DotPattern`) resolve to the exact export names Task 1 installs.
