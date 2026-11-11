#!/usr/bin/env python3
"""Report where the tokens of Claude Code sessions went.

Usage: session-usage.py <transcript-dir> [--skip SESSION_ID ...]

<transcript-dir> is one project's folder under ~/.claude/projects/. Each session is
`<id>.jsonl`, and its subagents are `<id>/subagents/*.jsonl`. The report reads token
counters, tool names, and the inputs of Read and Agent calls. It prints no message text.

Context is the input side of one API call: fresh input plus cache writes plus cache
reads, in tokens. `first_ctx` is the context of a transcript's first call, so it is what
the session pays before any work. The fixed share is `first_ctx` times the number of
calls, over all context tokens.

Written against the transcript format of Claude Code 2.1.
"""

import argparse
import collections
import glob
import json
import os

CONTEXT_FIELDS = (
    "input_tokens",
    "cache_creation_input_tokens",
    "cache_read_input_tokens",
)


def read_transcript(path):
    """Return the API calls and the tool uses of one transcript.

    A call streams as several rows that share a message id. The last row carries the
    final usage, and each row carries its own content blocks.
    """
    calls, tool_uses = {}, {}
    with open(path, errors="replace") as transcript:
        for line in transcript:
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            message = row.get("message") or {}
            if (
                row.get("type") != "assistant"
                or not message.get("usage")
                or not message.get("id")
            ):
                continue
            calls[message["id"]] = (
                row.get("effort"),
                message.get("model", "?"),
                message["usage"],
            )
            for block in message.get("content") or []:
                if block.get("type") == "tool_use":
                    tool_uses[block["id"]] = block
    return calls.values(), tool_uses.values()


def summarize(path):
    calls, tool_uses = read_transcript(path)
    contexts, efforts = [], collections.Counter()
    spawns, skill_reads = collections.Counter(), collections.Counter()
    output = thinking = 0
    model = "?"
    for effort, model, usage in calls:
        contexts.append(sum(usage.get(field) or 0 for field in CONTEXT_FIELDS))
        output += usage.get("output_tokens") or 0
        thinking += (usage.get("output_tokens_details") or {}).get(
            "thinking_tokens"
        ) or 0
        efforts[str(effort)] += 1
    for block in tool_uses:
        count_tool_use(block, spawns, skill_reads)
    return {
        "model": model,
        "contexts": contexts,
        "output": output,
        "thinking": thinking,
        "efforts": efforts,
        "spawns": spawns,
        "skill_reads": skill_reads,
    }


def count_tool_use(block, spawns, skill_reads):
    args = block.get("input") or {}
    if block["name"] == "Agent":
        spawns[
            (
                args.get("subagent_type", "default"),
                args.get("model", "parent"),
                args.get("effort", "unset"),
            )
        ] += 1
    path = args.get("file_path", "")
    if block["name"] == "Read" and "/skills/" in path:
        skill_reads[path.split("/skills/", 1)[1]] += 1


def print_row(label, summary):
    contexts = summary["contexts"]
    share = 100 * summary["thinking"] // max(summary["output"], 1)
    efforts = ",".join(
        f"{effort}x{count}" for effort, count in summary["efforts"].items()
    )
    print(
        f"{label:<22} {summary['model']:<18} calls={len(contexts):>4} first_ctx={contexts[0]:>7,} "
        f"mean_ctx={sum(contexts) // len(contexts):>7,} max_ctx={max(contexts):>7,} "
        f"output={summary['output']:>7,} thinking={share:>2}% effort={efforts}"
    )


def print_totals(summaries):
    context = sum(sum(s["contexts"]) for s in summaries)
    fixed = sum(s["contexts"][0] * len(s["contexts"]) for s in summaries)
    output = sum(s["output"] for s in summaries)
    print(
        f"\ncontext tokens {context:,}, output tokens {output:,}, "
        f"fixed share {100 * fixed // max(context, 1)}% of context"
    )
    for title, key in (
        ("Agent spawns (type, model, effort)", "spawns"),
        ("Reads of skill files", "skill_reads"),
    ):
        total = sum((s[key] for s in summaries), collections.Counter())
        print(f"\n{title}")
        for item, count in total.most_common(25):
            print(f"{count:>5}  {item}")


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("transcript_dir")
    parser.add_argument("--skip", nargs="*", default=[], metavar="SESSION_ID")
    args = parser.parse_args()
    summaries = []
    for path in sorted(glob.glob(os.path.join(args.transcript_dir, "*.jsonl"))):
        session = os.path.basename(path)[: -len(".jsonl")]
        if session in args.skip:
            continue
        subagents = sorted(
            glob.glob(
                os.path.join(args.transcript_dir, session, "subagents", "*.jsonl")
            )
        )
        for label, transcript in [
            (session[:8], path),
            *(("  subagent", sub) for sub in subagents),
        ]:
            summary = summarize(transcript)
            if summary["contexts"]:
                print_row(label, summary)
                summaries.append(summary)
    if not summaries:
        parser.exit(1, f"no API calls found under {args.transcript_dir}\n")
    print_totals(summaries)


if __name__ == "__main__":
    main()
