import type { ActionDefinition } from "@w6w/types";
import { compact, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `DELETE /repos/{owner}/{repo}/contents/{filepath}` — verified against
 * Gitea's Swagger document (`repoDeleteFile`; required `sha`).
 *
 * Like the update, this needs the blob sha of the file being removed, and for
 * the same reason: it is the guard that stops a stale workflow deleting a file
 * somebody has since changed. The sha is fetched here rather than demanded from
 * the caller.
 *
 * A deleted file is not gone from the repository's history — that is what
 * version control is — but it is gone from the branch, and a workflow reading
 * it afterwards gets a 404.
 */
const action: ActionDefinition = {
  key: "file-delete",
  type: "perform",
  resource: "file",
  title: "Delete a file",
  description: "Commit the removal of a file, guarded by its current sha.",
  idempotent: true,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "path", label: "Path", type: "string", required: true, default: "" },
    { key: "message", label: "Commit Message", type: "string", default: "" },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      default: "",
      hint: "Blank commits to the default branch.",
    },
    {
      key: "confirm",
      label: "I mean to remove this file from the branch",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on.",
    },
  ],
  output: [
    { key: "commit", type: "object", label: "The commit" },
    { key: "path", type: "string", label: "Path" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const path = String(p.path ?? "").trim().replace(/^\/+/, "");
    if (!path) throw new Error("`path` is required");
    if (p.confirm !== true) throw new Error("`confirm` must be true — this removes the file");

    const client = new GiteaClient(ctx);
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const url = `/repos/${encodeURIComponent(owner)}/${
      encodeURIComponent(repo)
    }/contents/${encodedPath}`;
    const branch = String(p.branch ?? "").trim();

    // The sha guards against deleting a file someone has since changed.
    const existing = await client.request<{ sha?: string }>(url, {
      query: { ref: branch || undefined },
    });
    const sha = Array.isArray(existing) ? undefined : existing?.sha;
    if (!sha) throw new Error(`no file at "${path}" to delete — a directory has no sha`);

    ctx.log("warn", "deleting a Gitea file", { owner, repo, path });

    const result = await client.request<Record<string, unknown>>(url, {
      method: "DELETE",
      body: compact({ sha, message: p.message, branch: branch || undefined }),
    });
    return { ...result, path, deleted: true };
  },
};

export default action;
