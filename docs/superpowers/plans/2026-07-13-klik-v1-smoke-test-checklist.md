# Klik v1 — manual smoke test checklist

Run against real installs of Claude Desktop, Cursor, and VS Code on a dev machine before calling v1 done. This is the manual pass the design spec's Testing section calls for — it isn't automated.

## Detection
- [ ] With all 3 clients installed, Klik's client checklist shows all 3 as enabled/checked by default.
- [ ] With one client (e.g. Cursor) not installed, its checklist item is disabled with "Not detected on this machine."

## Install — stdio server, no secrets required
- [ ] Pick a registry server with no required env vars, target all 3 clients, click "Get Your Klik."
- [ ] Progress view shows "done" for each client.
- [ ] Restart each client; the server appears in its MCP server list and is actually callable.
- [ ] Confirm each client's config file was correctly written under its client-specific key (`mcpServers` for Claude Desktop/Cursor, `servers` for VS Code) and existing unrelated entries in each file were preserved.

## Install — server requiring a secret
- [ ] Pick a registry server with a required env var, select it, click install.
- [ ] Secret-prompt dialog appears before any config is written; "Continue" is disabled until the value is filled in.
- [ ] After submitting, the value appears in the written client config's `env` block — not anywhere else on disk (grep the app's userData directory to confirm no copy was persisted by Klik itself).

## Dependency install
- [ ] On a machine without Node.js installed, install an npm-backed server; confirm Klik runs `winget install --id OpenJS.NodeJS.LTS ...` and the install proceeds once it completes.
- [ ] On a machine without uv installed, install a pypi-backed server; confirm the same for `astral-sh.uv`.

## Uninstall / re-detection
- [ ] Relaunch Klik after installing a server; it should show as already-installed (state tracker persisted correctly).

## Error handling
- [ ] Disconnect the network and relaunch Klik; the server list still loads from the local registry cache with a "data may be stale" indication, rather than an empty list or a crash.
- [ ] Target a client that isn't installed; confirm the per-client error surfaces without blocking the other selected clients.
- [ ] Force an install to fail mid-flight (e.g. disconnect network after clicking install, or target a server with a bad/unreachable npm package). Confirm Klik surfaces a visible error and returns the user to a usable state (not stuck on the progress screen with "Done" permanently disabled). If it does get stuck, this is a known deferred bug from Task 12 review — file it, do not silently work around it in this task.
