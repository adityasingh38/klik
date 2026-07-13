# Klik — design spec

Date: 2026-07-13
Status: approved (pending final user sign-off on this doc)

## Summary

Klik is "Ninite for MCP servers" — a Windows desktop app that lets a non-technical
user check boxes next to MCP (Model Context Protocol) servers they want, click one
button, and have Klik install any missing runtime dependencies and wire the servers
into their installed AI clients' config files. No CLI, no hand-editing JSON.

## Naming

- Product name: **Klik**
- Domain: **klikmcp.dev** (unregistered as of 2026-07-13; klik.dev/klik.app/getklik.com
  are already taken)
- Repo: `klikmcp` (GitHub)
- Deliberately not a direct "Ninite" pun (e.g. "MCPite") to avoid trademark friction
  with Ninite the actual product.

## Competitive landscape (why this is worth building)

| Project | Gap |
|---|---|
| [MCPHub-Desktop](https://github.com/Jeamee/MCPHub-Desktop) | Closest prior art — Tauri GUI, one-click install. Stale (last release Dec 2024), Claude Desktop only, requires manual PRs to a separate submission repo for new servers. |
| [getmcp](https://github.com/RodrigoTomeES/getmcp) | Writes correct config across 19 clients, but CLI-only (breaks the "no terminal" promise) and a thin self-maintained registry (~105 servers). |
| [Smithery.ai](https://smithery.ai/) | Large hosted marketplace, but requires npx/CLI and centralizes execution on their infra. |
| Anthropic Desktop Extensions (.mcpb) | Official, polished, but Claude Desktop only and limited to Anthropic-reviewed servers. |
| mcpm.sh, mcp-hub, GitHub MCP Registry | CLI/registry infrastructure, not a consumer GUI installer. |

No one combines: (a) real double-click GUI, (b) multi-client config writing,
(c) a broad, current registry, (d) active maintenance. That's Klik's lane.

## Scope — v1

- **OS:** Windows only.
- **Clients:** Claude Desktop, Cursor, VS Code (MCP extension). Chosen as the three
  highest-usage MCP clients today — not the broader 19-client sweep getmcp does,
  to keep the config-adapter and testing surface manageable for v1.
- **Registry source:** official MCP registry (modelcontextprotocol.io API), not a
  Klik-original database. Solves cold start — rides on its ~9,400+ existing entries
  instead of competing with it.
- **Distribution:** Electron `.exe`, unsigned at launch (see Code signing below).

Out of scope for v1: macOS/Linux, auto-update, more than 3 clients, hosted/remote
MCP server execution, a Klik-hosted backend of any kind.

## Architecture

Electron app, standard main/renderer split:

- **Main process** (Node): filesystem access, dependency shell-outs (winget),
  registry HTTP calls, local cache, config file reads/writes.
- **Renderer** (React/TS): the checkbox-list UI — search/filter, select, "Get Your
  Klik" button, install progress screen.
- **IPC**: `contextBridge` preload script. `contextIsolation: true`,
  `nodeIntegration: false` — no deviation from standard Electron security posture.

## Components

1. **Registry client** — fetches from the official MCP registry, caches locally,
   normalizes metadata (name, transport type, required runtime, required env
   vars/secrets, publisher).
2. **Curation layer** — a static JSON file live in the `klikmcp` repo, keyed by
   registry ID, overlaying: verified badges, category tags, "tested by Klik" flags,
   warnings (e.g. "requires network access"). No backend to run; community PRs
   update it directly. This is the zero-infra bet that avoids MCPHub-Desktop's
   submission-repo friction.
3. **Client detector** — scans known Windows install paths for the 3 target
   clients, locates each one's config file path.
4. **Dependency installer** — checks for Node/Python/uv/Docker per selected
   server; installs missing runtimes silently via `winget`.
5. **Config writer** — per-client schema adapter merging new MCP entries into
   `claude_desktop_config.json`, `.cursor/mcp.json`, and VS Code's MCP settings,
   without touching unrelated keys.
6. **State tracker** — local record of what Klik installed, so relaunching shows
   checkmarks and enables one-click uninstall/update.

## Data flow

1. Launch → client detector scans → registry client loads (cache-first) →
   curation overlay merges in by registry ID.
2. User searches/filters, checks servers, toggles which detected client(s) to
   target.
3. Install → per server: ensure runtime dependency present (install via winget if
   missing) → resolve required secrets by prompting inline in the UI → write into
   each target client's config (atomic write, original backed up first). Secrets
   are written only into the target client's own config file — Klik never persists
   them itself (no local secret store, no telemetry of values).
4. Progress screen shows live per-server, per-client status.
5. Install state persisted locally for future uninstall/update.

## Error handling

- Target client not installed → skip silently, no blocking of other targets.
- Config file malformed → back up, validate post-write, abort that client with a
  clear error instead of clobbering it.
- Dependency install fails (no admin rights, network) → per-server error surfaced,
  rest of the batch continues.
- Registry unreachable → fall back to last cache, show a "data may be stale" banner.
- Missing required secret → flagged in the UI before install starts, never
  mid-batch.
- Target client running during config write → post-install banner instructing the
  user to restart it (all 3 clients require a restart to pick up new servers).

## Testing

- Unit tests per config-writer adapter: given an existing config + new entries,
  assert the merge doesn't touch unrelated keys.
- Unit tests for registry-normalize and curation-merge logic.
- Integration test: fixture directories mimicking each client's config path, run
  the full install flow, assert resulting file contents.
- Manual smoke matrix: real install/uninstall against real Claude Desktop, Cursor,
  and VS Code on a dev machine before v1 is considered done.

## Code signing

Windows SmartScreen will flag an unsigned `.exe` hard. Three paths evaluated:

- **SignPath Foundation** (free, OSS) — requires an existing release history to
  apply, so not usable at launch. Plan: apply after a few v1 releases ship and
  build a track record; migrate signing to them once approved.
- **Azure Trusted Signing** ($9.99/mo, no hardware token) — individual identity
  validation is currently US/Canada only; not available to an India-based
  individual developer without a registered business entity in an eligible region.
  Not usable now.
- **Traditional OV certificate** (Sectigo/Comodo via reseller, ~$219–226/yr /
  ~₹19,445/yr) — requires a physical USB HSM token (CA/Browser Forum mandate since
  June 2023), 5–10 day shipping to India, individual identity check via
  email/phone only. This is the realistic v1 path.

Decision: buy an OV cert for v1 launch; apply to SignPath Foundation once eligible
and switch over to drop the recurring cost. Until the cert is in hand, v1 ships
unsigned with a documented "Windows may warn you — click Run Anyway" note; this is
an explicit known limitation, not a silent gap.

## Open questions for future iterations (not v1)

- macOS/Linux support, once Windows traction is validated.
- Auto-update mechanism (electron-updater) once release cadence stabilizes.
- Whether to track anonymous install-count signals for the curation layer's
  "popularity" indicator, and if so, how to do it without phoning home by default.
