### Review

**You own the verdict. A fresh reviewer on your strongest model finds, you confirm.** For "review this diff", "review PR X", or `/code-review`. Review-bot comments on a PR go to `../references/review-bot-triage.md` instead.

The repo's rules live in its instruction files and its checks, never in a review-only rules file. Read them, run them, judge the rest.

1. **Spawn the reviewer.** One subagent on the model your `hardest tasks` role maps to, the strongest you have. Never the agent that wrote the code, even when the parent already runs that model. Hand it file pointers, not pasted context: the diff range or PR number, the stated intent, and this playbook.
2. **Learn the repo's rules from the repo.** Read the instruction files (`CLAUDE.md`, `AGENTS.md`, nested ones on changed paths) and the CI config. A rule written there binds the review. A rule CI already enforces is not a finding.
3. **Run the checks, don't re-derive them.** Run the tests and linters that cover the changed paths. A red check is a finding with its output as evidence.
4. **Trace what the diff touches beyond itself.** Changed fields, enum choices, signatures, and public names go through the **blast-radius** skill. Callers in other modules count.
5. **Read the code, not the names.** Every claim about behavior comes from reading the code path. Each finding cites `file:line` and says why it breaks, not only that it differs.
6. **Rank with one scale.**
   - `Important`. Breaks shipped behavior or blocks a rollback. A user-facing path returns wrong or missing data, a migration is not backward compatible or not reversible, a deploy step overwrites state production owns, data loss, an append-only record mutated, a security, auth, or privacy hole, a secret or personal data in code, logs, or errors.
   - `Nit`. Style, naming, refactoring taste. At most five per review.
   - Everything else is dropped, not softened into a nit.
7. **Skip what is not the author's code.** Generated code, lockfiles, vendored files, and scratch or ignored directories. Test code that breaks a production rule on purpose.
8. **Close the loop.** A finding that is a repo rule a check could enforce gets a second line naming that check (a test, a lint, a type) per the **encode-lessons-in-structure** principle skill. A rule that needs judgment and is missing from the instruction files gets proposed there.
9. **Confirm before reporting.** Re-read each finding's cited code yourself. Drop the ones that do not survive.

**Reply:** start with the finding count by severity. Then each finding with `file:line`, why it breaks, and the check that would enforce it if one fits. Nothing to fix is one line.
