import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ChecksUnavailable,
  WatcherQueryError,
  buildReviewThreads,
  mapRollupNode,
  orderStack,
  parseFastCheck,
  parsePullRequest,
  parseReviewThreadPage,
  resolveChecks,
  resolveContext,
  resolveReviewThreads,
} from "./github.ts";
import {
  fakeReader,
  failedCheck,
  passingCheck,
  pendingCheck,
} from "./fakes.test-helper.ts";
import { parsePrNumber } from "./types.ts";

const context = {
  owner: "owner",
  repo: "repo",
  number: parsePrNumber(42),
};

describe("checks fallback chain", () => {
  it("uses a non-empty fast-path result without a rollup query", async () => {
    const reader = fakeReader({
      fastPath: { kind: "checks", checks: [passingCheck("fast")] },
    });
    const read = await resolveChecks(reader, context);
    expect(read.source).toBe("gh-pr-checks");
    expect(read.checks.map((check) => check.name)).toEqual(["fast"]);
    expect(reader.calls).toEqual(["checksFastPath"]);
  });

  it("paginates GraphQL when the fast path is unusable", async () => {
    const reader = fakeReader({
      fastPath: { kind: "unusable", exitCode: 8, stderr: "" },
      rollupPages: [
        { checks: [passingCheck("first")], endCursor: "next" },
        { checks: [failedCheck("second")], endCursor: null },
      ],
    });
    const read = await resolveChecks(reader, context);
    expect(read.source).toBe("graphql-rollup");
    expect(read.checks.map((check) => check.name)).toEqual(["first", "second"]);
    expect(reader.calls).toEqual([
      "checksFastPath",
      "checkRollupPage:null",
      "checkRollupPage:next",
    ]);
  });

  it("falls back when valid fast-path JSON represented an empty list", async () => {
    const reader = fakeReader({
      fastPath: { kind: "checks", checks: [] },
      rollupPages: [{ checks: [pendingCheck("fallback")], endCursor: null }],
    });
    expect((await resolveChecks(reader, context)).checks[0].name).toBe(
      "fallback"
    );
    expect(reader.calls).toEqual(["checksFastPath", "checkRollupPage:null"]);
  });

  it("fails closed when both paths are empty", async () => {
    const reader = fakeReader({
      fastPath: {
        kind: "unusable",
        exitCode: 8,
        stderr: "credential cannot read checks",
      },
    });
    await expect(resolveChecks(reader, context)).rejects.toBeInstanceOf(
      ChecksUnavailable
    );
    expect(reader.calls).toEqual(["checksFastPath", "checkRollupPage:null"]);
  });
});

describe("rollup node mapping", () => {
  it("maps terminal and non-terminal CheckRun states fail closed", () => {
    const cases = [
      ["IN_PROGRESS", null, "pending", "PENDING"],
      ["COMPLETED", "SUCCESS", "passed", "SUCCESS"],
      ["COMPLETED", "NEUTRAL", "skipped", "NEUTRAL"],
      ["COMPLETED", "SKIPPED", "skipped", "SKIPPED"],
      ["COMPLETED", "ACTION_REQUIRED", "failed", "ACTION_REQUIRED"],
      ["COMPLETED", "TIMED_OUT", "failed", "FAILURE"],
      ["COMPLETED", "FUTURE_VALUE", "failed", "FAILURE"],
    ] as const;
    for (const [status, conclusion, kind, reportedState] of cases) {
      expect(
        mapRollupNode({
          __typename: "CheckRun",
          name: "ci",
          status,
          conclusion,
        })
      ).toMatchObject({ kind, reportedState });
    }
  });

  it("classifies an in-progress Code Review Gate from the rollup as the gate", () => {
    expect(
      mapRollupNode({
        __typename: "CheckRun",
        name: "Code Review Gate",
        status: "IN_PROGRESS",
        conclusion: null,
      })
    ).toMatchObject({ kind: "code-review-gate" });
    expect(
      mapRollupNode({
        __typename: "StatusContext",
        context: "Code Review Gate",
        state: "PENDING",
      })
    ).toMatchObject({ kind: "code-review-gate" });
  });

  it("classifies a Code Review Gate waiting on an owner approval as the gate", () => {
    expect(
      mapRollupNode({
        __typename: "CheckRun",
        name: "Code Review Gate",
        status: "COMPLETED",
        conclusion: "ACTION_REQUIRED",
        description: "1 of 2 policies",
      })
    ).toMatchObject({
      kind: "code-review-gate",
      reportedState: "ACTION_REQUIRED",
    });
  });

  it("classifies a fast-path Code Review Gate waiting on an owner approval as the gate", () => {
    expect(
      parseFastCheck({
        name: "Code Review Gate",
        state: "ACTION_REQUIRED",
        bucket: "fail",
      })
    ).toMatchObject({
      kind: "code-review-gate",
      reportedState: "ACTION_REQUIRED",
    });
    expect(
      parseFastCheck({ name: "ci", state: "ACTION_REQUIRED", bucket: "fail" })
    ).toMatchObject({ kind: "failed", reportedState: "ACTION_REQUIRED" });
  });

  it("maps StatusContext states and drops unknown typenames", () => {
    expect(
      mapRollupNode({
        __typename: "StatusContext",
        context: "ci",
        state: "EXPECTED",
      })
    ).toMatchObject({ kind: "pending", reportedState: "PENDING" });
    expect(
      mapRollupNode({
        __typename: "StatusContext",
        context: "ci",
        state: "FUTURE_VALUE",
      })
    ).toMatchObject({ kind: "failed", reportedState: "FUTURE_VALUE" });
    expect(mapRollupNode({ __typename: "FutureNode" })).toBeNull();
  });
});

describe("closed enum parsing", () => {
  const rawPullRequest = {
    mergeable: "MERGEABLE",
    mergeStateStatus: "CLEAN",
    reviewDecision: "APPROVED",
    headRefOid: "head",
    headRefName: "feature",
    baseRefName: "main",
    state: "OPEN",
    mergedAt: null,
    isDraft: false,
  };

  it("accepts mergeStateStatus CONFLICTING", () => {
    expect(
      parsePullRequest(
        { ...rawPullRequest, mergeStateStatus: "CONFLICTING" },
        context
      ).mergeStateStatus
    ).toBe("CONFLICTING");
  });

  it("reads gh's empty reviewDecision as no decision rather than a parse failure", () => {
    expect(
      parsePullRequest({ ...rawPullRequest, reviewDecision: "" }, context)
        .reviewDecision
    ).toBeNull();
  });

  it("still rejects an unknown reviewDecision", () => {
    expect(() =>
      parsePullRequest({ ...rawPullRequest, reviewDecision: "MAYBE" }, context)
    ).toThrow(WatcherQueryError);
  });

  it("rejects unknown enum values as retryable errors carrying the raw value", () => {
    try {
      parsePullRequest(
        { ...rawPullRequest, mergeStateStatus: "FUTURE_STATE" },
        context
      );
      throw new Error("expected parser to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(WatcherQueryError);
      if (!(error instanceof WatcherQueryError)) throw error;
      expect(error.failure).toMatchObject({
        kind: "missing-key",
        retryable: true,
        rawValue: '"FUTURE_STATE"',
      });
    }
  });
});

it("annotates review-bot threads with distinct review-pass counts", () => {
  const response = {
    data: {
      repository: {
        pullRequest: {
          reviewThreads: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: "one",
                isResolved: false,
                comments: {
                  nodes: [
                    {
                      body: "finding",
                      createdAt: "now",
                      path: null,
                      line: null,
                      author: { login: "copilot-pull-request-reviewer", __typename: "Bot" },
                      pullRequestReview: { id: "review-1" },
                    },
                  ],
                },
              },
              {
                id: "two",
                isResolved: false,
                comments: {
                  nodes: [
                    {
                      body: "finding",
                      createdAt: "now",
                      path: null,
                      line: null,
                      author: { login: "claude", __typename: "Bot" },
                      pullRequestReview: { id: "review-2" },
                    },
                  ],
                },
              },
              {
                id: "human",
                isResolved: false,
                comments: {
                  nodes: [
                    {
                      body: "finding",
                      createdAt: "now",
                      path: null,
                      line: null,
                      author: { login: "alice", __typename: "User" },
                      pullRequestReview: { id: "review-4" },
                    },
                  ],
                },
              },
              {
                id: "resolved",
                isResolved: true,
                comments: {
                  nodes: [
                    {
                      body: "finding",
                      createdAt: "now",
                      path: null,
                      line: null,
                      author: { login: "claude", __typename: "Bot" },
                      pullRequestReview: { id: "review-3" },
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    },
  };
  const threads = buildReviewThreads(parseReviewThreadPage(response).threads);
  expect(threads.map((thread) => thread.id)).toEqual(["one", "two", "human"]);
  expect(threads.map((thread) => thread.isReviewBot)).toEqual([true, true, false]);
  expect(threads.map((thread) => thread.reviewBotPasses)).toEqual([3, 3, 3]);
});

describe("review thread pagination", () => {
  const thread = (id: string, resolved = false) => ({
    id,
    firstComment: {
      authorLogin: "someone",
      authorIsBot: false,
      reviewId: null,
      body: "please fix",
      path: "a.ts",
      line: 1,
      createdAt: "now",
    },
    resolved,
  });

  it("keeps walking pages until the cursor is exhausted", async () => {
    const reader = fakeReader({
      threadPages: [
        { threads: [thread("one")], endCursor: "next" },
        { threads: [thread("two")], endCursor: "last" },
        { threads: [thread("three")], endCursor: null },
      ],
    });
    const threads = await resolveReviewThreads(reader, context);
    expect(threads.map((item) => item.id)).toEqual(["one", "two", "three"]);
    expect(reader.calls).toEqual([
      "reviewThreadPage:null",
      "reviewThreadPage:next",
      "reviewThreadPage:last",
    ]);
  });

  it("sees an unresolved thread that sits past the first page", async () => {
    const reader = fakeReader({
      threadPages: [
        { threads: [thread("early", true)], endCursor: "next" },
        { threads: [thread("late")], endCursor: null },
      ],
    });
    const threads = await resolveReviewThreads(reader, context);
    expect(threads.map((item) => item.id)).toEqual(["late"]);
  });

  it("stops after a single page when the cursor is exhausted", async () => {
    const reader = fakeReader({
      threadPages: [{ threads: [thread("only")], endCursor: null }],
    });
    expect((await resolveReviewThreads(reader, context)).length).toBe(1);
    expect(reader.calls).toEqual(["reviewThreadPage:null"]);
  });

  it("counts review bot passes across every page", async () => {
    const bot = (id: string, reviewId: string) => ({
      id,
      firstComment: {
        authorLogin: "some-review-bot",
        authorIsBot: true,
        reviewId,
        body: "finding",
        path: "a.ts",
        line: 1,
        createdAt: "now",
      },
      resolved: false,
    });
    const reader = fakeReader({
      threadPages: [
        { threads: [bot("one", "review-1")], endCursor: "next" },
        { threads: [bot("two", "review-2")], endCursor: null },
      ],
    });
    const threads = await resolveReviewThreads(reader, context);
    expect(threads.map((item) => item.reviewBotPasses)).toEqual([2, 2]);
  });

  it("drops resolved threads from later pages too", async () => {
    const reader = fakeReader({
      threadPages: [
        { threads: [thread("one")], endCursor: "next" },
        { threads: [thread("two", true)], endCursor: null },
      ],
    });
    expect(
      (await resolveReviewThreads(reader, context)).map((item) => item.id)
    ).toEqual(["one"]);
  });

  it("rejects a page that omits pageInfo instead of assuming one page", async () => {
    const response = {
      data: {
        repository: {
          pullRequest: { reviewThreads: { nodes: [] } },
        },
      },
    };
    expect(() => parseReviewThreadPage(response)).toThrow(WatcherQueryError);
  });
});

describe("context and stack discovery", () => {
  it("returns a fully explicit context without any reader call", async () => {
    const reader = fakeReader();
    expect(
      await resolveContext({
        reader,
        owner: "explicit",
        repo: "repo",
        pr: context.number,
      })
    ).toEqual({ owner: "explicit", repo: "repo", number: context.number });
    expect(reader.calls).toEqual([]);
  });

  it("uses the local origin before currentPr for an explicit number", async () => {
    const reader = fakeReader({ origin: { owner: "local", repo: "checkout" } });
    expect(
      await resolveContext({
        reader,
        owner: null,
        repo: null,
        pr: context.number,
      })
    ).toEqual({ owner: "local", repo: "checkout", number: context.number });
    expect(reader.calls).toEqual(["originRepo"]);
  });

  it("orders the connected stack bottom-to-top", () => {
    const ordered = orderStack(context, [
      {
        number: parsePrNumber(41),
        headRefName: "base-feature",
        isCrossRepository: false,
        baseRefName: "main",
      },
      {
        number: context.number,
        headRefName: "feature",
        isCrossRepository: false,
        baseRefName: "base-feature",
      },
      {
        number: parsePrNumber(43),
        headRefName: "upstack",
        isCrossRepository: false,
        baseRefName: "feature",
      },
    ]);
    expect(ordered.map((item) => Number(item.number))).toEqual([41, 42, 43]);
  });
  it("keeps a trunk stack intact when main is long-lived", () => {
    const ordered = orderStack(context, [
      { number: parsePrNumber(41), headRefName: "base-feature", baseRefName: "main", isCrossRepository: false },
      { number: context.number, headRefName: "feature", baseRefName: "base-feature", isCrossRepository: false },
    ], new Set(["main"]));
    expect(ordered.map((item) => Number(item.number))).toEqual([41, 42]);
  });

  it("does not stack a feature on a main -> production release PR", () => {
    const ordered = orderStack(context, [
      { number: parsePrNumber(11), headRefName: "main", baseRefName: "production", isCrossRepository: false },
      { number: context.number, headRefName: "feature", baseRefName: "main", isCrossRepository: false },
    ], new Set(["main", "production"]));
    expect(ordered.map((item) => Number(item.number))).toEqual([42]);
  });

  it("does not stack a git-flow feature on a develop -> main release PR", () => {
    const ordered = orderStack(context, [
      { number: parsePrNumber(10), headRefName: "develop", baseRefName: "main", isCrossRepository: false },
      { number: context.number, headRefName: "feature", baseRefName: "develop", isCrossRepository: false },
    ], new Set(["develop", "main"]));
    expect(ordered.map((item) => Number(item.number))).toEqual([42]);
  });

  it("does not pull every feature into a watched release PR's stack", () => {
    const release = { ...context, number: parsePrNumber(11) };
    const ordered = orderStack(release, [
      { number: parsePrNumber(11), headRefName: "main", baseRefName: "production", isCrossRepository: false },
      { number: context.number, headRefName: "feature", baseRefName: "main", isCrossRepository: false },
    ], new Set(["main", "production"]));
    expect(ordered.map((item) => Number(item.number))).toEqual([11]);
  });

  it("does not use a fork's same-named head as a stack parent", () => {
    const ordered = orderStack(context, [
      { number: parsePrNumber(41), headRefName: "base-feature", baseRefName: "main", isCrossRepository: true },
      { number: context.number, headRefName: "feature", baseRefName: "base-feature", isCrossRepository: false },
    ]);
    expect(ordered.map((item) => Number(item.number))).toEqual([42]);
  });

  it("does not attach upstream branch children to a fork head", () => {
    const ordered = orderStack(context, [
      { number: context.number, headRefName: "feature", baseRefName: "main", isCrossRepository: true },
      { number: parsePrNumber(43), headRefName: "upstack", baseRefName: "feature", isCrossRepository: false },
    ]);
    expect(ordered.map((item) => Number(item.number))).toEqual([42]);
  });

  it("terminates when an unrelated fork opens main against main", () => {
    // Bound the subprocess so this regression reports a failure instead of hanging the suite.
    const program = `import { orderStack } from ${JSON.stringify(import.meta.dir + "/github.ts")};
      console.log(JSON.stringify(orderStack(${JSON.stringify(context)}, [
        { number: 41, headRefName: "main", baseRefName: "main", isCrossRepository: true },
        { number: 42, headRefName: "feature", baseRefName: "main", isCrossRepository: false }
      ])));`;
    const child = spawnSync(process.execPath, ["-e", program], { encoding: "utf8", timeout: 2000 });
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout).map((item: { number: number }) => item.number)).toEqual([42]);
  });

  it("terminates when two same-repo PRs target each other", () => {
    // Bound the subprocess so this regression reports a failure instead of hanging the suite.
    const program = `import { orderStack } from ${JSON.stringify(import.meta.dir + "/github.ts")};
      console.log(JSON.stringify(orderStack(${JSON.stringify(context)}, [
        { number: 10, headRefName: "develop", baseRefName: "main", isCrossRepository: false },
        { number: 11, headRefName: "main", baseRefName: "develop", isCrossRepository: false },
        { number: 42, headRefName: "feature", baseRefName: "develop", isCrossRepository: false }
      ])));`;
    const child = spawnSync(process.execPath, ["-e", program], { encoding: "utf8", timeout: 2000 });
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
    const numbers: number[] = JSON.parse(child.stdout).map((item: { number: number }) => item.number);
    expect(numbers.at(-1)).toBe(42);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("requests and parses fork identity from gh before stack discovery", () => {
    const directory = mkdtempSync(join(tmpdir(), "watch-pr-fork-"));
    try {
      writeFileSync(join(directory, "gh"), `#!/bin/sh
case "$*" in
  *number,headRefName,baseRefName,isCrossRepository*) ;;
  *) exit 2 ;;
esac
printf '%s\\n' '[{"number":42,"headRefName":"feature","baseRefName":"main","isCrossRepository":true}]'
`, { mode: 0o755 });
      const program = `import { GhGitHubReader } from ${JSON.stringify(import.meta.dir + "/github.ts")};
        console.log(JSON.stringify(await new GhGitHubReader().openPullRequests({ owner: "owner", repo: "repo" })));`;
      const child = spawnSync(process.execPath, ["-e", program], {
        encoding: "utf8", timeout: 2000,
        env: { ...process.env, PATH: directory + ":" + process.env.PATH },
      });
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      expect(JSON.parse(child.stdout)).toEqual([
        { number: 42, headRefName: "feature", baseRefName: "main", isCrossRepository: true },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  const longLivedFromFakeGh = (protectedScript: string): unknown => {
    const directory = mkdtempSync(join(tmpdir(), "watch-pr-branches-"));
    try {
      writeFileSync(join(directory, "gh"), `#!/bin/sh
case "$*" in
  *protected=true*) ${protectedScript} ;;
  "api repos/owner/repo") printf '%s\\n' '{"default_branch":"trunk"}' ;;
  *) exit 2 ;;
esac
`, { mode: 0o755 });
      const program = `import { GhGitHubReader } from ${JSON.stringify(import.meta.dir + "/github.ts")};
        console.log(JSON.stringify([...await new GhGitHubReader().longLivedBranches({ owner: "owner", repo: "repo" })]));`;
      const child = spawnSync(process.execPath, ["-e", program], {
        encoding: "utf8", timeout: 2000,
        env: { ...process.env, PATH: directory + ":" + process.env.PATH },
      });
      expect(child.error).toBeUndefined();
      expect(child.status).toBe(0);
      return JSON.parse(child.stdout);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  };

  it("reads the default branch and protected branches as long-lived", () => {
    expect(longLivedFromFakeGh("printf 'trunk\\nproduction\\n'")).toEqual(["trunk", "production"]);
  });

  it("ignores a blanket protection rule that covers feature branches", () => {
    expect(longLivedFromFakeGh("seq 1 11 | sed 's/^/feature-/'")).toEqual(["trunk"]);
  });

  it("falls back to the default branch when protection cannot be read", () => {
    expect(longLivedFromFakeGh("echo 'HTTP 403' >&2; exit 1")).toEqual(["trunk"]);
  });

});
