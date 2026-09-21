/// <reference types="bun-types-no-globals/lib/index.d.ts" />

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdin } from "bun";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const STATE_DIR = resolve(PROJECT_DIR, ".claude/hooks/state");
const INCREMENTAL_INDEX_PATH = resolve(
  PROJECT_DIR,
  ".claude/hooks/state/continual-learning-index.json"
);
const DEFAULT_MIN_TURNS = 10;
const DEFAULT_MIN_MINUTES = 120;
const TRIAL_DEFAULT_MIN_TURNS = 3;
const TRIAL_DEFAULT_MIN_MINUTES = 15;
const TRIAL_DEFAULT_DURATION_MINUTES = 24 * 60;

const FOLLOWUP_MESSAGE =
  `Run the \`continual-learning\` skill now. Use the \`agents-memory-updater\` subagent for the full memory update flow. Use incremental transcript processing with index file \`${INCREMENTAL_INDEX_PATH}\`: only consider transcripts not in the index or transcripts whose mtime is newer than indexed mtime. Have the subagent refresh index mtimes, remove entries for deleted transcripts, and update \`AGENTS.md\` only for high-signal recurring user corrections and durable workspace facts. Exclude one-off/transient details and secrets. If no meaningful updates exist, respond exactly: No high-signal memory updates.`;

interface StopHookInput {
  session_id: string;
  prompt_id?: string;
  stop_hook_active?: boolean;
  transcript_path?: string | null;
  last_assistant_message?: string;
}

interface ContinuousLearningState {
  version: 1;
  lastRunAtMs: number;
  turnsSinceLastRun: number;
  lastTranscriptMtimeMs: number | null;
  lastProcessedPromptId: string | null;
  trialStartedAtMs: number | null;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function readEnvValue(primary: string, legacy: string): string | undefined {
  return process.env[primary] ?? process.env[legacy];
}

// Cadence state is per session, not per project. Two sessions open on the same
// repo must not share turnsSinceLastRun, lastRunAtMs or lastProcessedPromptId,
// or one session's stop advances the other's counter and the memory update
// fires on the wrong conversation's work.
function statePathFor(sessionId: string | undefined): string {
  const safe = (sessionId ?? "").replace(/[^A-Za-z0-9._-]/g, "-").slice(0, 96);
  const suffix = safe.length > 0 ? safe : "unknown-session";
  return resolve(STATE_DIR, `continual-learning-${suffix}.json`);
}

function loadState(statePath: string): ContinuousLearningState {
  const fallback: ContinuousLearningState = {
    version: 1,
    lastRunAtMs: 0,
    turnsSinceLastRun: 0,
    lastTranscriptMtimeMs: null,
    lastProcessedPromptId: null,
    trialStartedAtMs: null,
  };

  if (!existsSync(statePath)) {
    return fallback;
  }

  try {
    const raw = readFileSync(statePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ContinuousLearningState>;
    if (parsed.version !== 1) {
      return fallback;
    }
    return {
      version: 1,
      lastRunAtMs:
        typeof parsed.lastRunAtMs === "number" && Number.isFinite(parsed.lastRunAtMs)
          ? parsed.lastRunAtMs
          : 0,
      turnsSinceLastRun:
        typeof parsed.turnsSinceLastRun === "number" &&
        Number.isFinite(parsed.turnsSinceLastRun) &&
        parsed.turnsSinceLastRun >= 0
          ? parsed.turnsSinceLastRun
          : 0,
      lastTranscriptMtimeMs:
        typeof parsed.lastTranscriptMtimeMs === "number" &&
        Number.isFinite(parsed.lastTranscriptMtimeMs)
          ? parsed.lastTranscriptMtimeMs
          : null,
      lastProcessedPromptId:
        typeof parsed.lastProcessedPromptId === "string"
          ? parsed.lastProcessedPromptId
          : null,
      trialStartedAtMs:
        typeof parsed.trialStartedAtMs === "number" &&
        Number.isFinite(parsed.trialStartedAtMs)
          ? parsed.trialStartedAtMs
          : null,
    };
  } catch {
    return fallback;
  }
}

function saveState(statePath: string, state: ContinuousLearningState): void {
  const directory = dirname(statePath);
  if (!existsSync(directory)) {
    mkdirSync(directory, { recursive: true });
  }
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
}

function getTranscriptMtimeMs(transcriptPath: string | null | undefined): number | null {
  if (!transcriptPath) {
    return null;
  }

  try {
    return statSync(transcriptPath).mtimeMs;
  } catch {
    return null;
  }
}

function shouldCountTurn(input: StopHookInput): boolean {
  // stop_hook_active is true when this stop was itself caused by a hook
  // continuation; do not count those as user turns.
  if (input.stop_hook_active === true) {
    return false;
  }
  // The Stop payload has no status field, so a non-empty final assistant
  // message is the only available stand-in for the turn having completed.
  // Without it, interrupted turns count toward the threshold and the memory
  // update fires over transcript content nobody asked to learn from.
  return (input.last_assistant_message ?? "").trim().length > 0;
}

async function parseHookInput<T>(): Promise<T> {
  const text = await stdin.text();
  return JSON.parse(text) as T;
}

async function main(): Promise<number> {
  try {
    const input = await parseHookInput<StopHookInput>();
    const statePath = statePathFor(input.session_id);
    const state = loadState(statePath);

    if (input.prompt_id && input.prompt_id === state.lastProcessedPromptId) {
      console.log(JSON.stringify({}));
      return 0;
    }
    state.lastProcessedPromptId = input.prompt_id ?? null;

    const countedTurn = shouldCountTurn(input);
    const turnIncrement = countedTurn ? 1 : 0;
    const turnsSinceLastRun = state.turnsSinceLastRun + turnIncrement;
    const now = Date.now();

    const trialEnabled = parseBoolean(
      readEnvValue("CONTINUAL_LEARNING_TRIAL_MODE", "CONTINUOUS_LEARNING_TRIAL_MODE")
    );
    if (trialEnabled && countedTurn && state.trialStartedAtMs === null) {
      state.trialStartedAtMs = now;
    }

    const trialDurationMinutes = parsePositiveInt(
      readEnvValue(
        "CONTINUAL_LEARNING_TRIAL_DURATION_MINUTES",
        "CONTINUOUS_LEARNING_TRIAL_DURATION_MINUTES"
      ),
      TRIAL_DEFAULT_DURATION_MINUTES
    );
    const trialMinTurns = parsePositiveInt(
      readEnvValue(
        "CONTINUAL_LEARNING_TRIAL_MIN_TURNS",
        "CONTINUOUS_LEARNING_TRIAL_MIN_TURNS"
      ),
      TRIAL_DEFAULT_MIN_TURNS
    );
    const trialMinMinutes = parsePositiveInt(
      readEnvValue(
        "CONTINUAL_LEARNING_TRIAL_MIN_MINUTES",
        "CONTINUOUS_LEARNING_TRIAL_MIN_MINUTES"
      ),
      TRIAL_DEFAULT_MIN_MINUTES
    );
    const inTrialWindow =
      trialEnabled &&
      state.trialStartedAtMs !== null &&
      now - state.trialStartedAtMs < trialDurationMinutes * 60_000;

    const minTurns = parsePositiveInt(
      readEnvValue("CONTINUAL_LEARNING_MIN_TURNS", "CONTINUOUS_LEARNING_MIN_TURNS"),
      DEFAULT_MIN_TURNS
    );
    const minMinutes = parsePositiveInt(
      readEnvValue("CONTINUAL_LEARNING_MIN_MINUTES", "CONTINUOUS_LEARNING_MIN_MINUTES"),
      DEFAULT_MIN_MINUTES
    );

    const effectiveMinTurns = inTrialWindow ? trialMinTurns : minTurns;
    const effectiveMinMinutes = inTrialWindow ? trialMinMinutes : minMinutes;
    const minutesSinceLastRun =
      state.lastRunAtMs > 0
        ? Math.floor((now - state.lastRunAtMs) / 60000)
        : Number.POSITIVE_INFINITY;
    const transcriptMtimeMs = getTranscriptMtimeMs(input.transcript_path);
    const hasTranscriptAdvanced =
      transcriptMtimeMs !== null &&
      (state.lastTranscriptMtimeMs === null || transcriptMtimeMs > state.lastTranscriptMtimeMs);

    const shouldTrigger =
      countedTurn &&
      turnsSinceLastRun >= effectiveMinTurns &&
      minutesSinceLastRun >= effectiveMinMinutes &&
      hasTranscriptAdvanced;

    if (shouldTrigger) {
      state.lastRunAtMs = now;
      state.turnsSinceLastRun = 0;
      state.lastTranscriptMtimeMs = transcriptMtimeMs;
      saveState(statePath, state);

      console.log(
        JSON.stringify({
          decision: "block",
          reason: FOLLOWUP_MESSAGE,
          systemMessage: "Continual learning: memory update triggered.",
        })
      );
      return 0;
    }

    state.turnsSinceLastRun = turnsSinceLastRun;
    saveState(statePath, state);
    console.log(JSON.stringify({}));
    return 0;
  } catch (error) {
    console.error("[continual-learning-stop] failed", error);
    console.log(JSON.stringify({}));
    return 0;
  }
}

const exitCode = await main();
process.exit(exitCode);
