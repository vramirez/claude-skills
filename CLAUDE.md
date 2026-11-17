# Working in this repo

## Optimizing or trimming a plugin

When the request is to optimize, trim, slim, or cut the token cost of a plugin or skill here, measure before you edit. The user should not have to name the script or remember that it exists.

1. Run `python3 scripts/session-usage.py <transcript-dir>`, where `<transcript-dir>` is this repo's folder under `~/.claude/projects/`. The skills do most of their work in other repos, so ask which other project folders to measure and run the script once per folder.
2. Compare the totals line with the last entry in `scripts/session-usage-log.md`. Transcripts are deleted after about 30 days, so the log is the only baseline that survives.
3. Change the largest measured cost first. Say what the numbers show before you propose an edit.
4. Append the new totals line to the log, with the date and the plugin version, in the same PR as the change.
