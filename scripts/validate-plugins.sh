#!/usr/bin/env bash
# Validate the marketplace manifest, every plugin manifest, and every plugin's
# skills, agents, and commands with `claude plugin validate --strict`.
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

failures=0
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

run() {
  local target="$1"
  if claude plugin validate "$target" $strict >"$log" 2>&1; then
    echo "ok:   ${target#"$root"/}"
  else
    echo "FAIL: ${target#"$root"/}"
    grep -E '❯|✘' "$log" | sed 's/^/  /'
    failures=$((failures + 1))
  fi
}

run "$root"

while IFS= read -r source; do
  plugin_dir="$root/${source#./}"
  run "$plugin_dir"
  for component in skills agents commands; do
    [[ -d "$plugin_dir/$component" ]] && run "$plugin_dir/$component"
  done
done < <(jq -r '.plugins[].source' "$root/.claude-plugin/marketplace.json")

if (( failures > 0 )); then
  echo
  echo "Validation failed for $failures target(s)."
  exit 1
fi
echo
echo "All plugins validated successfully."
