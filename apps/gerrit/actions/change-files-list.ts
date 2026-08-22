import type { ActionDefinition } from "@w6w/types";
import { assertChangeId, GerritClient, query } from "../lib/client.ts";

/**
 * `GET /a/changes/{id}/revisions/{rev}/files/` — what a change touches.
 *
 * ## Also keyed by path, and `/COMMIT_MSG` is in there
 *
 * The same shape as the comments endpoint: an object whose keys are file
 * paths. `/COMMIT_MSG` appears as an entry, so a naive count of "files changed"
 * is one too many, and a workflow routing by path has a path that matches no
 * owner.
 *
 * ## `status` says what happened to each file
 *
 * Absent means modified — which is the trap, because every other state has a
 * letter: `A` added, `D` deleted, `R` renamed, `C` copied, `W` rewritten. A
 * filter on `status === "M"` matches nothing at all.
 *
 * ## Size is the useful signal for routing
 *
 * `lines_inserted` and `lines_deleted` per file, and `size_delta` in bytes. A
 * change touching forty files with two lines each is a rename or a lint fix; a
 * change touching one file with four hundred lines is a rewrite. Different
 * reviewers, and this is how a workflow tells them apart.
 */
const action: ActionDefinition = {
  key: "change-files-list",
  type: "read",
  resource: "file",
  title: "List a change's files",
  description:
    "What a change touches, keyed by path — with `/COMMIT_MSG` among the entries, so a naive " +
    "file count is one too many. A modified file has NO status letter, which is why filtering " +
    "on `M` matches nothing.",
  params: [
    { key: "changeId", label: "Change", type: "string", required: true, default: "" },
    {
      key: "revision",
      label: "Revision",
      type: "string",
      default: "current",
      hint: "A patch set number or `current`.",
    },
    {
      key: "pathPrefix",
      label: "Path prefix",
      type: "string",
      default: "",
      hint: "Filtered here — useful for asking whether a change touches one directory.",
    },
  ],
  output: [
    { key: "files", type: "array", label: "The files, with what happened to each" },
    { key: "count", type: "number", label: "Real files, excluding the commit message" },
    { key: "paths", type: "array", label: "Just the paths" },
    { key: "added", type: "array", label: "New files" },
    { key: "deleted", type: "array", label: "Removed files" },
    { key: "renamed", type: "array", label: "Moved files" },
    { key: "linesInserted", type: "number", label: "Total added" },
    { key: "linesDeleted", type: "number", label: "Total removed" },
    { key: "touchesCommitMessage", type: "boolean", label: "Whether the message was edited" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const changeId = assertChangeId(p.changeId);
    const revision = String(p.revision ?? "current").trim() || "current";

    const byPath = await new GerritClient(ctx).request<
      Record<string, {
        status?: string;
        lines_inserted?: number;
        lines_deleted?: number;
        size_delta?: number;
        old_path?: string;
        binary?: boolean;
      }>
    >(
      `/changes/${encodeURIComponent(changeId)}/revisions/${encodeURIComponent(revision)}/files/`,
      { query: query({ q: String(p.pathPrefix ?? "").trim() || undefined }) },
    );

    const entries = Object.entries(byPath ?? {});
    const prefix = String(p.pathPrefix ?? "").trim();
    const commitMessage = "/COMMIT_MSG";

    const files = entries
      // The commit message is reviewable and is not a file in the repository.
      .filter(([path]) => path !== commitMessage)
      .filter(([path]) => !prefix || path.startsWith(prefix))
      .map(([path, file]) => ({
        path,
        // No letter means modified, which is why filtering on "M" finds nothing.
        status: file?.status ?? "M",
        linesInserted: file?.lines_inserted ?? 0,
        linesDeleted: file?.lines_deleted ?? 0,
        sizeDelta: file?.size_delta,
        oldPath: file?.old_path,
        isBinary: file?.binary === true,
      }));

    const withStatus = (letter: string) =>
      files.filter((file) => file.status === letter).map((file) => file.path);

    return {
      files,
      count: files.length,
      paths: files.map((file) => file.path),
      added: withStatus("A"),
      deleted: withStatus("D"),
      renamed: withStatus("R"),
      linesInserted: files.reduce((sum, file) => sum + file.linesInserted, 0),
      linesDeleted: files.reduce((sum, file) => sum + file.linesDeleted, 0),
      touchesCommitMessage: entries.some(([path]) => path === commitMessage),
    };
  },
};

export default action;
