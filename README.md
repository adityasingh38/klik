# Klik

**One-click MCP server installer for Windows.**

Browse the [Model Context Protocol](https://modelcontextprotocol.io) registry, pick the servers you want, and install them straight into Claude Desktop, Cursor, or VS Code — no manual JSON config editing, no restarting five times to see if you got the syntax right.

![Klik screenshot](docs/screenshot.png)

## Why

Installing an MCP server today usually means: finding the right package name, hand-editing a client's config file, guessing at the right `command`/`args` shape, providing any required API keys, and restarting the client to find out if it worked. Multiply that by every server you want and every client you use.

Klik turns that into: search, check a box, click install.

## Features

- **Live registry browsing** — pulls from the official MCP registry, with instant load from a local cache while it refreshes in the background.
- **Multi-client install** — install the same server into Claude Desktop, Cursor, and VS Code in one pass.
- **Secret prompting** — if a server needs an API key or other required env var, Klik asks for it inline before installing, instead of failing silently at runtime.
- **Clean uninstall** — remove a server from a client without hand-editing config files.
- **Curated overlay** — a small curation layer marks trusted servers as "Verified" on top of the raw registry data.
- **Offline-friendly** — a local cache means the server list is usable even without a fresh network round-trip every launch.

## Install

Download the latest installer from the [Releases](../../releases) page and run it. Klik installs to your machine like any normal Windows app — no admin rights, no terminal required.

## Supported clients

| Client | Status |
|---|---|
| Claude Desktop | ✅ |
| Cursor | ✅ |
| VS Code | ✅ |

Klik detects which of these are actually installed on your machine and only lets you target the ones that are.

## Development

```bash
git clone https://github.com/adityasingh38/klik.git
cd klik
npm install
npm run dev          # start the app in dev mode
```

Other scripts:

```bash
npm test             # run the test suite (vitest)
npm run typecheck    # type-check main + renderer
npm run build:win    # produce a Windows installer in release/
```

### Stack

Electron (`electron-vite`) + React 19 + TypeScript, Tailwind v4 (CSS-first config) with shadcn/ui (`base-nova` style) and [Magic UI](https://magicui.design) for motion, `@base-ui/react` primitives under the hood.

## Contributing

Issues and PRs welcome. If you're adding a new target client, look at `src/main/clients/` — each client is a small, self-contained adapter (`detect`, `configFileAdapter`, etc.) implementing a shared interface, so a new one is a new file, not a rewrite.

## License

[MIT](LICENSE)
