# claude-skills

Claude Code plugin marketplace with developer tools, agent skills, and MCP integrations. This repository is a port of the Cursor plugins marketplace to the Claude Code plugin format. Each plugin is a standalone directory with its own `.claude-plugin/plugin.json` manifest, and the root `.claude-plugin/marketplace.json` lists them all.

## Install

Add the marketplace once, then install any plugin by name:

```
/plugin marketplace add vramirez/claude-skills
/plugin install <name>@claude-skills
```

Plugins that need credentials declare them in `userConfig`; Claude Code prompts for those values at install time.

To try a single plugin without installing it:

```
claude --plugin-dir ./<name>
```

## Plugins

| `name` | Plugin | Author | Category | `description` (from marketplace) |
|:-------|:-------|:-------|:---------|:-------------------------------------|
| `teaching` | [Teaching](teaching/) | Cursor (original) | Utilities | Skill mapping, practice plans, and learning retrospectives. |
| `continual-learning` | [Continual Learning](continual-learning/) | Eric Zakariasson (original) | Developer Tools | Incremental transcript-driven memory updates for AGENTS.md using high-signal bullet points only. |
| `cursor-team-kit` | [Cursor Team Kit](cursor-team-kit/) | Eric Zakariasson (original) | Developer Tools | Internal team workflows for CI, code review, shipping, local automation, and verification. |
| `thermos` | [Thermos](thermos/) | Cursor (original) | Developer Tools | Thermo-nuclear branch review: deep security/correctness audits, harsh code-quality rubrics, parallel subagents, thermos orchestration, and optional merge-ready PR flows. |
| `create-plugin` | [Create Plugin](create-plugin/) | Cursor (original) | Developer Tools | Scaffold and validate new agent plugins. |
| `ralph-loop` | [Ralph Loop](ralph-loop/) | Cursor (original) | Developer Tools | Iterative self-referential AI loops using the Ralph Wiggum technique. |
| `agent-compatibility` | [Agent Compatibility](agent-compatibility/) | Cursor (original) | Developer Tools | CLI-backed repo compatibility scans plus agents that audit startup, validation, and docs against reality. |
| `cli-for-agent` | [CLI for Agents](cli-for-agent/) | Eric Zakariasson (original) | Developer Tools | Patterns for designing CLIs that coding agents can run reliably: flags, help with examples, pipelines, errors, idempotency, dry-run. |
| `pr-review-canvas` | [PR Review Canvas](pr-review-canvas/) | Cursor (original) | Developer Tools | Render PR diffs as review canvases grouped by importance. |
| `docs-canvas` | [Docs Canvas](docs-canvas/) | Cursor (original) | Developer Tools | Render documentation as a navigable canvas. |
| `cursor-sdk` | [Cursor SDK](cursor-sdk/) | Cursor (original) | Developer Tools | Build apps, scripts, and automations with the TypeScript SDK. |
| `orchestrate` | [Orchestrate](orchestrate/) | Cursor (original) | Developer Tools | Fan large tasks out across parallel cloud agents with planners, workers, verifiers, and structured handoffs. |
| `pstack` | [pstack](pstack/) | Lauren Tan | Developer Tools | if you want to go fast, go deep first. pstack helps you write less, but higher quality code. rigorous agent workflows you can parallelize with confidence. |
| `advisor` | [Advisor](advisor/) | Cursor (original) | Developer Tools | Consult a stronger model before major decisions, when stuck, and before declaring done. |
| `grok-voice` | [Grok Voice](grok-voice/) | Eric Zakariasson (original) | Developer Tools | Add Grok voice to an app: realtime speech-to-speech, speech-to-text dictation, text-to-speech read-aloud, and a log-driven fix loop for voice sessions. |
| `gmail` | [Gmail](third_party/gmail/) | Cursor (original) | Productivity | Search, read, draft, and manage email. |
| `google-drive` | [Google Drive](third_party/google-drive/) | Cursor (original) | Productivity | Search, read, create, and share files. |
| `google-calendar` | [Google Calendar](third_party/google-calendar/) | Cursor (original) | Productivity | Search events and schedule meetings. |
| `gong` | [Gong](third_party/gong/) | Cursor (original) | Integrations | Pull account summaries, deal insights, and call briefs. |
| `salesforce` | [Salesforce](third_party/salesforce/) | Cursor (original) | Integrations | Query, create, and update records in your org. |
| `playwright` | [Playwright](third_party/playwright/) | Cursor (original) | Integrations | Navigate, click, screenshot, and test in a real browser. |
| `github` | [GitHub](third_party/github/) | Cursor (original) | Integrations | Manage repos, issues, pull requests, and Actions. |
| `ashby` | [Ashby](third_party/ashby/) | Cursor (original) | Integrations | Search candidates, prep interviews, and manage pipeline tasks. |
| `hubspot` | [HubSpot](third_party/hubspot/) | Cursor (original) | Integrations | Search and update contacts, companies, deals, and tickets. |
| `intercom` | [Intercom](third_party/intercom/) | Cursor (original) | Integrations | Search conversations, contacts, and Help Center articles. |
| `zoom` | [Zoom](third_party/zoom/) | Cursor (original) | Integrations | Search meetings, pull transcripts, and work with Zoom Docs. |
| `x` | [X](third_party/x/) | Cursor (original) | Integrations | Search posts, read timelines, pull trends, and manage bookmarks. |
| `clay` | [Clay](third_party/clay/) | Cursor (original) | Integrations | Enrich people and companies, run AI research agents. |
| `circleback` | [Circleback](third_party/circleback/) | Cursor (original) | Integrations | Search meetings, transcripts, action items, and emails. |
| `docusign` | [Docusign](third_party/docusign/) | Cursor (original) | Integrations | Manage envelopes, templates, workflows, and agreements. |
| `navan` | [Navan](third_party/navan/) | Cursor (original) | Integrations | Query expenses, travel bookings, policies, and cards. |
| `profound` | [Profound](third_party/profound/) | Cursor (original) | Integrations | Track AI visibility, sentiment, and citations. |
| `juicebox` | [Juicebox](third_party/juicebox/) | Cursor (original) | Integrations | Query recruiting analytics, shortlists, and sourcing agents. |
| `outreach` | [Outreach](third_party/outreach/) | Cursor (original) | Integrations | Search sequences, prospects, and Kaia meetings. |
| `amplemarket` | [Amplemarket](third_party/amplemarket/) | Cursor (original) | Integrations | Search people and companies, enrich leads, run sequences. |
| `klaviyo` | [Klaviyo](third_party/klaviyo/) | Cursor (original) | Integrations | Manage profiles, segments, campaigns, and flows. |
| `customer-io` | [Customer.io](third_party/customer-io/) | Cursor (original) | Integrations | Build campaigns, manage segments, and query people. |
| `mailerlite` | [MailerLite](third_party/mailerlite/) | Cursor (original) | Integrations | Manage subscribers, groups, campaigns, and automations. |
| `brevo` | [Brevo](third_party/brevo/) | Cursor (original) | Integrations | Manage contacts, email and SMS campaigns, and CRM deals. |
| `typeform` | [Typeform](third_party/typeform/) | Cursor (original) | Integrations | Build forms, analyze responses, and manage contacts. |
| `jotform` | [Jotform](third_party/jotform/) | Cursor (original) | Integrations | Create and edit forms, then read submissions. |
| `semrush` | [Semrush](third_party/semrush/) | Cursor (original) | Integrations | Research keywords, backlinks, traffic, and competitors. |
| `ahrefs` | [Ahrefs](third_party/ahrefs/) | Cursor (original) | Integrations | Research keywords, backlinks, rankings, and site health. |
| `godaddy` | [GoDaddy](third_party/godaddy/) | Cursor (original) | Integrations | Brainstorm domain names and check availability. |
| `upwork` | [Upwork](third_party/upwork/) | Cursor (original) | Integrations | Search talent, post jobs, and manage contracts. |
| `workable` | [Workable](third_party/workable/) | Cursor (original) | Integrations | Search candidates, move pipelines, and manage HR records. |
| `brex` | [Brex](third_party/brex/) | Cursor (original) | Integrations | Query expenses, receipts, bills, cards, and travel. |
| `mercury` | [Mercury](third_party/mercury/) | Cursor (original) | Integrations | Read balances, transactions, statements, and cards. |
| `todoist` | [Todoist](third_party/todoist/) | Cursor (original) | Integrations | Create, find, and complete tasks and projects. |
| `calendly` | [Calendly](third_party/calendly/) | Cursor (original) | Integrations | Check availability and book, cancel, or reschedule. |
| `smartsheet` | [Smartsheet](third_party/smartsheet/) | Cursor (original) | Integrations | Query and update sheets, rows, and workspaces. |
| `wrike` | [Wrike](third_party/wrike/) | Cursor (original) | Integrations | Search projects, create tasks, and post comments. |
| `coda` | [Coda](third_party/coda/) | Cursor (original) | Integrations | Search docs, read pages, and update tables. |
| `guru` | [Guru](third_party/guru/) | Cursor (original) | Integrations | Search company knowledge and draft verified answers. |
| `fireflies` | [Fireflies](third_party/fireflies/) | Cursor (original) | Integrations | Search meeting transcripts, summaries, and action items. |
| `otter` | [Otter.ai](third_party/otter/) | Cursor (original) | Integrations | Search meeting history and pull full transcripts. |
| `fathom` | [Fathom](third_party/fathom/) | Cursor (original) | Integrations | Search meetings and pull transcripts and summaries. |
| `craft` | [Craft](third_party/craft/) | Cursor (original) | Integrations | Search, create, and update documents and daily notes. |
| `mem` | [Mem](third_party/mem/) | Cursor (original) | Integrations | Capture, search, and organize notes and collections. |
| `readwise` | [Readwise](third_party/readwise/) | Cursor (original) | Integrations | Search highlights and Reader documents, save articles. |
| `similarweb` | [Similarweb](third_party/similarweb/) | Cursor (original) | Integrations | Analyze website traffic, audiences, and competitors. |
| `xero` | [Xero](third_party/xero/) | Cursor (original) | Integrations | Read and write invoices, contacts, reports, and payroll. |
| `x-ads` | [X Ads](third_party/x-ads/) | Cursor (original) | Integrations | Manage ad campaigns, create ads, track conversions, and pull performance stats. |
| `attio` | [Attio](third_party/attio/) | Cursor (original) | Integrations | Search and update CRM records, lists, notes, and tasks. |
| `hunter` | [Hunter](third_party/hunter/) | Cursor (original) | Integrations | Find and verify emails, discover companies, and save leads. |
| `gamma` | [Gamma](third_party/gamma/) | Cursor (original) | Integrations | Generate presentations, documents, and webpages. |
| `teams` | [Teams](third_party/teams/) | Cursor (original) | Productivity | Search, read, and send Microsoft Teams chats and channel messages. |
| `sharepoint` | [SharePoint](third_party/sharepoint/) | Cursor (original) | Productivity | Search and read Microsoft SharePoint sites, document libraries, files, and lists. |
| `finance` | [Finance](third_party/finance/) | Cursor (original) | Integrations | Securely connect your accounts so Grok can help with questions about your spending, subscriptions, balances, and investments. |
| `webull` | [Webull](third_party/webull/) | Cursor (original) | Integrations | View accounts, positions, orders, watchlists, and market data. |
| `sp-global` | [S&P Global](third_party/sp-global/) | Cursor (original) | Integrations | Query S&P Capital IQ financials, prices, and transcripts. |
| `interactive-brokers` | [Interactive Brokers](third_party/interactive-brokers/) | Cursor (original) | Integrations | Review positions, balances, P&L, and draft trade instructions. |
| `meltwater` | [Meltwater](third_party/meltwater/) | Cursor (original) | Integrations | Search media and social mentions and pull analytics. |
| `daloopa` | [Daloopa](third_party/daloopa/) | Cursor (original) | Integrations | Pull source-linked fundamentals, KPIs, filings, and prices. |
| `excalidraw` | [Excalidraw](third_party/excalidraw/) | Cursor (original) | Integrations | Draw and export hand-drawn diagrams from chat. |
| `google-cloud-bigquery` | [Google Cloud BigQuery](third_party/google-cloud-bigquery/) | Cursor (original) | Integrations | Explore datasets and tables and run SQL queries. |

Author values match each plugin's `plugin.json` `author.name`. First-party plugins were written by Cursor and ported here; third-party plugins wrap the named vendor's MCP server.

## Repository structure

```
claude-skills/
├── .claude-plugin/
│   └── marketplace.json       # Marketplace manifest (lists all plugins)
├── plugin-name/
│   ├── .claude-plugin/
│   │   └── plugin.json        # Per-plugin manifest
│   ├── skills/                # Agent skills (SKILL.md with frontmatter)
│   ├── agents/                # Subagent definitions (*.md with frontmatter)
│   ├── hooks/hooks.json       # Lifecycle hooks
│   ├── .mcp.json              # MCP server definitions
│   ├── README.md
│   ├── CHANGELOG.md
│   └── LICENSE
├── third_party/               # Vendor MCP integrations, same layout
└── scripts/validate-plugins.sh
```

## Validation

Every manifest, skill, agent, and hook is checked with the Claude Code CLI:

```
scripts/validate-plugins.sh
```

The script requires `claude` and `jq` on the PATH and runs `claude plugin validate --strict` on the marketplace, every plugin, and every component directory. CI runs the same script on pull requests.

## Porting notes

Cursor concepts map to Claude Code as follows:

| Cursor | Claude Code |
|:-------|:------------|
| `.cursor-plugin/` | `.claude-plugin/` |
| `mcp.json` | `.mcp.json` |
| `variables` in `plugin.json` | `userConfig` |
| `rules/*.mdc` | skills with `paths` frontmatter |
| `afterAgentResponse`, `stop`, `subagentStop`, `afterFileEdit` hooks | `Stop`, `SubagentStop`, `PostToolUse` hooks reading `last_assistant_message` |
| `followup_message` | `{"decision": "block", "reason": ...}` |
| `${CURSOR_PLUGIN_ROOT}` | `${CLAUDE_PLUGIN_ROOT}` |
| `.cursor/<state>` | `.claude/<state>` |
| agent `readonly: true` | `disallowedTools: Edit, Write, MultiEdit, NotebookEdit` |
| agent `is_background` | `background` |
| agent `model: fast` | `model: haiku` |

A few plugins remain tied to Cursor services and are kept for reference: `cursor-sdk`, `orchestrate` (Cursor cloud agents and `CURSOR_API_KEY`), the pstack `benny` automations (Cursor Automations), and the Canvas rendering in `docs-canvas` and `pr-review-canvas`.

## License

MIT
