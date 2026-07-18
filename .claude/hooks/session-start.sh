#!/bin/bash
#
# SessionStart hook for Claude Code on the web.
#
# Installs npm dependencies so that `npm run test`, `npm run lint`, and
# `npm run build` work immediately in a fresh remote session. Runs
# synchronously so dependencies are guaranteed present before the agent loop
# starts (no race conditions). Idempotent and non-interactive.
set -euo pipefail

# Only run in the remote (Claude Code on the web) environment; local machines
# manage their own dependencies.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# `npm install` (not `npm ci`) so the cached container state can be reused
# across sessions and partial installs are repaired in place.
npm install --no-audit --no-fund
