# AGENTS.md — Copilot Instructions for ScrobbleVault

> Guidance for AI coding agents working on the ScrobbleVault repository.

## Project identity

ScrobbleVault is a **Bun.js project with both a web app and an Ink-based CLI**.

- Web app entry point: `/home/runner/work/ScrobbleVault/ScrobbleVault/src/index.ts`
- CLI entry point: `/home/runner/work/ScrobbleVault/ScrobbleVault/src/cli/index.tsx`

It stores listening history in SQLite and supports Last.fm, Libre.fm, ListenBrainz, and self-hosted ScrobbleVault compatibility flows across browser pages, JSON endpoints, compatibility APIs, and terminal views.

## Runtime and dependency rules

- Use **Bun** for install, execution, and validation
- Prefer Bun-native APIs over Node-compatible modules whenever Bun already provides the capability
- Do not add Express, Fastify, Axios, `better-sqlite3`, Lodash, or similar replacements for functionality Bun already covers
- Avoid bare Node imports such as `"fs"` or `"crypto"` in source files; use Bun-native APIs or explicit `node:` imports only when truly necessary

## Commands that matter

```bash
bun install
bun run typecheck
bun dev
bun start
bun run cli help
```

There is no dedicated lint or unit-test suite in this repo today. The normal validation path is:

1. `bun run typecheck`
2. smoke-test startup for the changed surface
3. run the affected CLI or web entry point when relevant

## Structure

```text
ScrobbleVault/
├── src/index.ts
├── src/auth.ts
├── src/config.ts
├── src/db.ts
├── src/lastfm.ts
├── src/listenbrainz.ts
├── src/queries.ts
├── src/scrobble.ts
├── src/cli/
├── src/web/
├── .github/workflows/qa.yml
├── .github/workflows/copilot-setup-steps.yml
├── .github/copilot-instructions.md
├── .github/WORKFLOWS.md
└── README.md
```

## Protocol guidance

- Base URL: `https://libre.fm/2.0/`
- Libre.fm currently accepts any **32-character** API key and shared secret
- Libre.fm blocks behavior that looks like automated scraping, so preserve the current identifiable `User-Agent` behavior in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/lastfm.ts`
- If you update auth or network guidance, keep the README, Settings UI copy, and source comments consistent with the Libre.fm fundamentals page: <https://github.com/libre-fm/developer/wiki/Libre.fm-fundamentals>
- The self-hosted backend exposes a Last.fm-compatible `/2.0/` endpoint for Panoscrobbler-style clients and other ScrobbleVault instances
- The self-hosted backend also exposes ListenBrainz-compatible `/1/` endpoints for token-based submission and history APIs
- Keep instructions aligned with the repository’s current multi-protocol support instead of describing the app as Last.fm/Libre.fm-only

## Implementation guidance

- Use strict TypeScript
- Prefer localized, understandable changes, but fully complete the task instead of stopping at a partial fix
- Keep web HTML server-rendered in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/web/templates.ts`
- Register web routes in `/home/runner/work/ScrobbleVault/ScrobbleVault/src/web/routes.ts`
- Treat the Ink CLI under `/home/runner/work/ScrobbleVault/ScrobbleVault/src/cli` as supported product code, not as an afterthought
- Use parameterized SQL and existing escaping helpers for security-sensitive work

## GitHub workflow guidance

- CI is defined in `/home/runner/work/ScrobbleVault/ScrobbleVault/.github/workflows/qa.yml`
- Copilot environment bootstrap is defined in `/home/runner/work/ScrobbleVault/ScrobbleVault/.github/workflows/copilot-setup-steps.yml`
- If the task touches CI or workflow failures, inspect the actual GitHub Actions metadata and logs rather than relying only on local assumptions

## Planner + implementer workflow

- For large tasks, analyze the repository first and split the work into small independent issues instead of implementing one large PR
- Every issue should include clear scope, acceptance criteria, and the files likely to be modified
- Use `copilot-plan` for planning/breakdown issues, `copilot-ready` for scoped implementation issues, and `copilot-review` for follow-up review or validation work
- Keep each issue small enough for a single PR and prefer multiple focused issues over one broad task
- When assigned an issue, treat it as the source of truth, open a draft PR, implement only that scoped task, and link the PR back to the issue
- Use the templates in `/home/runner/work/ScrobbleVault/ScrobbleVault/.github/ISSUE_TEMPLATE/` when creating or refining this work
