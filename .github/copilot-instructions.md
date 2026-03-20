# GitHub Copilot Instructions for ScrobbleVault

> Custom instructions for GitHub Copilot when working on the ScrobbleVault project.

## Project identity

ScrobbleVault is a **Bun.js application with two user-facing entry points**:

- a Bun-powered **web app** in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/index.ts`
- an Ink-based **TUI CLI** in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/cli/index.tsx`

It stores listening history in a local SQLite database and supports **Last.fm**, **Libre.fm**, **ListenBrainz**, and a self-hosted **ScrobbleVault** compatibility backend. It exposes browser pages, JSON endpoints, a Last.fm-compatible `/2.0/` layer, and a ListenBrainz-compatible `/1/` layer.

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
│   ├── auth.ts               Local auth and session helpers
│   ├── db.ts                 SQLite schema and helpers
│   ├── lastfm.ts             Last.fm + Libre.fm API client
│   ├── listenbrainz.ts       ListenBrainz payload parsing and formatting helpers
│   ├── queries.ts            SQL query helpers
│   ├── scrobble.ts           Scrobble normalization, dedupe, and insertion
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

## Protocol and network guidance

ScrobbleVault supports these compatibility families:

| Family | Base/API shape |
|---|---|
| Last.fm | `https://ws.audioscrobbler.com/2.0/` |
| Libre.fm | `https://libre.fm/2.0/` |
| ScrobbleVault compatibility | another ScrobbleVault instance via `/2.0/` |
| ListenBrainz | token-based `/1/` endpoints |

Important Libre.fm specifics reflected in the codebase:

- Libre.fm follows the same `auth.getMobileSession` flow used by Last.fm
- Libre.fm API keys and shared secrets must be **32 characters long**, but are not otherwise validated today
- Libre.fm blocks traffic that looks like automated scraping, so requests should keep the existing identifiable `User-Agent` behavior in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/lastfm.ts`
- If you touch Libre.fm behavior, keep the guidance in the Settings UI and docs aligned with the current Libre.fm fundamentals page: <https://github.com/libre-fm/developer/wiki/Libre.fm-fundamentals>

Important compatibility specifics reflected in the codebase:

- The self-hosted backend exposes a Last.fm-compatible `/2.0/` endpoint for scrobbling clients such as Panoscrobbler and other ScrobbleVault instances
- The self-hosted backend also exposes ListenBrainz-style `/1/` endpoints for token-authenticated submission and history APIs
- If you update protocol support or Settings UI copy, keep the README, templates, and instructions aligned with the current supported networks and endpoint families

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

## Planner + implementer workflow

When given a large task:

1. Analyze the repository before proposing implementation work
2. Break the work into small, independent issues
3. For each issue, include:
   - clear scope
   - acceptance criteria
   - files likely to be modified
4. Keep each issue small enough for a single PR
5. Prefer multiple focused issues over one large task
6. Do **not** implement a large cross-cutting change directly in one PR

Use the issue templates in `/home/runner/work/ScrobbleVault/ScrobbleVault/.github/ISSUE_TEMPLATE/` when creating or refining work items.

Use these labels consistently:

- `copilot-plan` for large-task planning and issue breakdown
- `copilot-ready` for a scoped implementation issue that is ready for a single PR
- `copilot-review` for follow-up review, validation, or handoff work on an already scoped change

When assigned an issue:

- Treat the issue as the full source of truth
- Open a draft PR before implementation work begins
- Implement only the scoped task in that issue
- Link the PR back to the issue
- Do not expand the PR into adjacent tasks unless the issue is updated first

## Task quality expectation

Keep changes focused, but **fully complete the requested work**. Do not stop at a partial fix just because a smaller edit is possible.
