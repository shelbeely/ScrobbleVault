# GitHub Actions Workflows

## Overview

ScrobbleVault uses Bun-powered GitHub Actions workflows for CI and Copilot environment setup.  
There is no Python, no uv, no pip, and no PyPI publishing.

## Workflows

### `qa.yml` — Continuous Integration

**Triggers:** Every push and every pull request on any branch.

**Steps:**

| Step | What it does |
|---|---|
| Set up Bun | Installs the latest Bun 1.x release via `oven-sh/setup-bun` |
| `bun install` | Installs dev dependencies (TypeScript types only) |
| `bun run typecheck` | Runs `tsc --noEmit` — zero errors required |
| Verify no bare Node imports | Fails if any `src/` file imports from `"fs"`, `"crypto"`, etc. without `node:` prefix |
| Smoke-test startup | Runs `bun run src/index.ts --help` to confirm the app starts |

### `copilot-setup-steps.yml` — GitHub Copilot coding agent bootstrap

**Purpose:** Prepares the repository environment before GitHub Copilot coding agent starts work.

**Steps:**

| Step | What it does |
|---|---|
| Checkout | Checks out repository contents |
| Set up Bun | Installs Bun 1.x via `oven-sh/setup-bun` |
| `bun install` | Installs the project dependencies used by the agent session |

### Local Equivalents

```bash
bun install          # install deps
bun run typecheck    # type-check
bun dev              # start dev server
bun start            # start prod server
bun run cli help     # smoke-test the CLI entry point
```

## Updating Bun Version

Edit the `bun-version` matrix in `qa.yml`:

```yaml
matrix:
  bun-version: ["1.x"]   # or pin to e.g. "1.3.11"
```

The `oven-sh/setup-bun` action supports semver ranges and exact versions.
See: https://github.com/oven-sh/setup-bun
