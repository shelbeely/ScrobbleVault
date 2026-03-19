# GitHub Copilot Instructions for ScrobbleVault

> Custom instructions for GitHub Copilot when working on the ScrobbleVault project.

## Project identity

ScrobbleVault is a **Bun.js application with two user-facing entry points**:

- a Bun-powered **web app** in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/index.ts`
- an Ink-based **TUI CLI** in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/cli/index.tsx`

It stores Last.fm and Libre.fm listening history in a local SQLite database and exposes both browser pages and JSON endpoints.

## Runtime rules

- Use **Bun** as the runtime and package manager
- Prefer Bun-native APIs:
  - `Bun.serve()` for HTTP
  - `Bun.file()` / `Bun.write()` for file I/O
  - `Bun.CryptoHasher` for hashing
  - `Bun.sleep()` for async delays
  - `Bun.spawn()` / `Bun.spawnSync()` for subprocesses
  - `import { Database } from "bun:sqlite"` for SQLite
- Do not add Node-first frameworks or replacement libraries that Bun already covers
- Do not import bare `"fs"`, `"crypto"`, `"http"`, `"os"`, `"path"`, or `"readline"` from source files; if a Node compatibility import is truly required, use the explicit `node:` prefix

## Core commands

```bash
bun install
bun run typecheck
bun dev
bun start
bun run cli help
```

There is currently **no separate lint or unit-test suite** in this repository. The main validation path is:

1. `bun run typecheck`
2. a lightweight startup smoke test such as `bun run src/index.ts --help`
3. for CLI changes, `bun run cli help` or the affected CLI command

## Repository map

```text
ScrobbleVault/
├── src/
│   ├── index.ts              Web server entry point
│   ├── config.ts             XDG paths, auth persistence, network config
│   ├── db.ts                 SQLite schema and helpers
│   ├── lastfm.ts             Last.fm + Libre.fm API client
│   ├── queries.ts            SQL query helpers
│   ├── cli/
│   │   ├── index.tsx         Ink CLI entry point
│   │   ├── export.ts         CLI export helpers
│   │   └── components/       Ink UI components
│   └── web/
│       ├── routes.ts         HTTP routes and JSON API
│       └── templates.ts      Server-rendered HTML templates
├── .github/
│   ├── copilot-instructions.md
│   ├── WORKFLOWS.md
│   └── workflows/
│       ├── qa.yml
│       └── copilot-setup-steps.yml
├── AGENTS.md
├── README.md
└── package.json
```

## Network-specific guidance

ScrobbleVault supports both **Last.fm** and **Libre.fm**:

| Network | Base API URL |
|---|---|
| Last.fm | `https://ws.audioscrobbler.com/2.0/` |
| Libre.fm | `https://libre.fm/2.0/` |

Important Libre.fm specifics reflected in the codebase:

- Libre.fm follows the same `auth.getMobileSession` flow used by Last.fm
- Libre.fm API keys and shared secrets must be **32 characters long**, but are not otherwise validated today
- Libre.fm blocks traffic that looks like automated scraping, so requests should keep the existing identifiable `User-Agent` behavior in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/lastfm.ts`
- If you touch Libre.fm behavior, keep the guidance in the Settings UI and docs aligned with the current Libre.fm fundamentals page: <https://github.com/libre-fm/developer/wiki/Libre.fm-fundamentals>

## Coding conventions

- TypeScript strict mode must stay clean under `bun run typecheck`
- Prefer `unknown` plus narrowing over `any`
- Use `camelCase` for variables/functions, `PascalCase` for types/components, and `UPPER_SNAKE_CASE` for module constants
- Keep imports relative for project files
- Use parameterized SQL queries
- Escape user-controlled strings in HTML with the existing escaping helpers

## Working on the web UI

- Add or update page rendering in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/web/templates.ts`
- Register routes in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/web/routes.ts`
- Preserve the existing server-rendered HTML style instead of introducing a frontend framework

## Working on the CLI

- The CLI is a first-class part of this repository; do not treat it as unsupported
- CLI rendering is built with **Ink** and **React**
- Reusable terminal UI components live under `/home/runner/work/ScrobbleVault/ScrobbleVault/src/cli/components`

## GitHub Actions and Copilot environment

- CI lives in `/home/runner/work/ScrobbleVault/ScrobbleVault/.github/workflows/qa.yml`
- Copilot environment bootstrap lives in `/home/runner/work/ScrobbleVault/ScrobbleVault/.github/workflows/copilot-setup-steps.yml`
- When changing workflows or Copilot setup, keep `/home/runner/work/ScrobbleVault/ScrobbleVault/.github/WORKFLOWS.md` in sync
- When a task involves CI or workflow behavior, prefer using GitHub Actions tooling to inspect the actual workflow definitions and runs instead of guessing

## Task quality expectation

Keep changes focused, but **fully complete the requested work**. Do not stop at a partial fix just because a smaller edit is possible.
