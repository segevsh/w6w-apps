import type { ActionDefinition } from "@w6w/types";
import { assertChangeId, GerritClient } from "../lib/client.ts";

/**
 * `GET /a/changes/{id}/comments` — the inline review comments, by file.
 *
 * ## Unresolved comments are the thing to act on
 *
 * Gerrit tracks resolution per comment thread, and on many projects an
 * unresolved thread is a submit requirement in its own right. So "which
 * changes are blocked on a conversation nobody has finished" is a real
 * question, and this is where it is answered.
 *
 * ## The response is keyed by file path, not a list
 *
 * `{"src/main.c": [ … ], "/COMMIT_MSG": [ … ]}`. Iterating it as an array
 * yields nothing. And `/COMMIT_MSG` is a real key: Gerrit treats the commit
 * message as a reviewable file, so comments on the message live under a path
 * that does not exist in the repository.
 *
 * ## Comments belong to a patch set
 *
 * Each carries the `patch_set` it was written against. A comment on patch set
 * 3 of a change now on patch set 7 may have been addressed six revisions ago
 * and still be unresolved, because resolution is a human act rather than a
 * consequence of pushing.
 */
const action: ActionDefinition = {
  key: "change-comments-list",
  type: "read",
  resource: "comment",
  title: "List a change's comments",
  description:
    "Inline review comments, keyed BY FILE PATH rather than as a list — including `/COMMIT_MSG`, " +
    "which Gerrit treats as a reviewable file. Separates UNRESOLVED threads, which on many " +
    "projects block a submit by themselves.",
  params: [
    { key: "changeId", label: "Change", type: "string", required: true, default: "" },
    {
      key: "unresolvedOnly",
      label: "Unresolved only",
      type: "boolean",
      default: false,
      hint: "The threads somebody is still waiting on.",
    },
  ],
  output: [
    { key: "comments", type: "array", label: "Every comment, flattened with its file" },
    { key: "count", type: "number", label: "How many, after filtering" },
    { key: "unresolvedCount", type: "number", label: "Threads still open" },
    { key: "files", type: "array", label: "Which files have comments" },
    { key: "onCommitMessage", type: "number", label: "Comments on the commit message itself" },
    { key: "authors", type: "array", label: "Who has commented" },
    { key: "latestPatchSet", type: "number", label: "The newest patch set commented on" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const changeId = assertChangeId(p.changeId);

    // Keyed by path, so iterating it as an array yields nothing.
    const byFile = await new GerritClient(ctx).request<
      Record<
        string,
        Array<{
          id?: string;
          line?: number;
          message?: string;
          unresolved?: boolean;
          patch_set?: number;
          author?: { name?: string; username?: string };
        }>
      >
    >(`/changes/${encodeURIComponent(changeId)}/comments`);

    const all = Object.entries(byFile ?? {}).flatMap(([file, comments]) =>
      (comments ?? []).map((comment) => ({ ...comment, file }))
    );
    const unresolved = all.filter((comment) => comment?.unresolved === true);
    const comments = p.unresolvedOnly === true ? unresolved : all;

    // Counts and paths. The comments themselves are somebody's review.
    ctx.log("info", "read Gerrit comments", {
      changeId,
      count: comments.length,
      unresolvedCount: unresolved.length,
    });

    return {
      comments,
      count: comments.length,
      unresolvedCount: unresolved.length,
      files: Object.keys(byFile ?? {}),
      // Gerrit reviews the commit message as a file with no repository path.
      onCommitMessage: (byFile?.["/COMMIT_MSG"] ?? []).length,
      authors: [
        ...new Set(
          comments
            .map((comment) => comment?.author?.username ?? comment?.author?.name)
            .filter(Boolean) as string[],
        ),
      ],
      latestPatchSet: comments.reduce(
        (latest, comment) => Math.max(latest, Number(comment?.patch_set ?? 0)),
        0,
      ) || undefined,
    };
  },
};

export default action;
