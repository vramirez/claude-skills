#!/usr/bin/env bash
# Validate the marketplace manifest and every plugin manifest with
# `claude plugin validate --strict`. The plugin-directory call already walks
# that plugin's own skills, agents, and commands, so they are not revisited:
# validating a component directory on its own is looser and passes files the
# plugin-directory call rejects.
#
# Frontmatter is parsed separately by scripts/check-frontmatter.rb first. The
# CLI's own frontmatter strictness varies by build, and this check does not.
# Usage: scripts/validate-plugins.sh [--no-strict]

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
strict="--strict"
[[ "${1:-}" == "--no-strict" ]] && strict=""

command -v claude >/dev/null 2>&1 || {
  echo "ERROR: claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code" >&2
  exit 2
}
command -v jq >/dev/null 2>&1 || { echo "ERROR: jq not found" >&2; exit 2; }
command -v ruby >/dev/null 2>&1 || { echo "ERROR: ruby not found (needed for the frontmatter check)" >&2; exit 2; }

failures=0
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

run() {
  local target="$1"
  if claude plugin validate "$target" $strict >"$log" 2>&1; then
    echo "ok:   ${target#"$root"/}"
  else
    echo "FAIL: ${target#"$root"/}"
    # A non-matching grep must not abort the run under `set -e -o pipefail`.
    # A failure carrying neither glyph (CLI crash, auth prompt, timeout) still
    # needs its output shown, or CI reports a bare FAIL with no reason.
    if ! grep -E '❯|✘' "$log" | sed 's/^/  /'; then
      sed 's/^/  /' "$log" | tail -20
    fi
    failures=$((failures + 1))
  fi
}

# Fast and build-independent, so it runs before the slow CLI loop.
if ! ruby "$root/scripts/check-frontmatter.rb" "$root"; then
  failures=$((failures + 1))
fi

run "$root"

while IFS= read -r source; do
  run "$root/${source#./}"
done < <(jq -r '.plugins[].source' "$root/.claude-plugin/marketplace.json")

if (( failures > 0 )); then
  echo
  echo "Validation failed for $failures target(s)."
  exit 1
fi
echo
echo "All plugins validated successfully."
