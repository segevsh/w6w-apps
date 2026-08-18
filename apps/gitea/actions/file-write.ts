import type { ActionDefinition } from "@w6w/types";
import { compact, encodeBase64, GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `POST` (create) and `PUT` (update) `/repos/{owner}/{repo}/contents/{filepath}`
 * — verified against Gitea's Swagger document (`repoCreateFile`,
 * `repoUpdateFile`; both require `content`, and update also requires `sha`).
 *
 * **The `sha` is an optimistic-concurrency guard, not paperwork.** Updating a
 * file requires the blob sha of the version being replaced: send the wrong one
 * and Gitea refuses rather than clobbering whatever landed in between. Since
 * nobody has that sha to hand, this action fetches it — one extra read, in
 * exchange for a write that cannot silently overwrite someone else's commit.
 *
 * That also makes create-or-update a single action: the fetch tells us which
 * verb applies, so a workflow re-running on a file it already wrote does not
 * fail.
 *
 * **`force_push` is deliberately not offered.** Gitea accepts it on file
 * writes, and it is the one flag here that can discard history rather than add
 * to it. A workflow step is not where that decision belongs.
 */
const action: ActionDefinition = {
  key: "file-write",
  type: "perform",
  resource: "file",
  title: "Create or update a file",
  description: "Commit a file's contents, fetching the sha so a concurrent change is not lost.",
  idempotent: true,
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "path", label: "Path", type: "string", required: true, default: "" },
    {
      key: "content",
      label: "Contents",
      type: "text",
      required: true,
      default: "",
      hint: "Plain text. It is base64-encoded on the way out, as Gitea requires.",
    },
    {
      key: "message",
      label: "Commit Message",
      type: "string",
      default: "",
      hint: "Gitea writes a default message if this is blank.",
    },
    {
      key: "branch",
      label: "Branch",
      type: "string",
      default: "",
      hint: "Blank commits to the default branch.",
    },
    {
      key: "newBranch",
      label: "New Branch",
      type: "string",
      default: "",
      hint: "Creates this branch from Branch and commits there instead — the safe way to " +
        "propose a change.",
    },
  ],
  output: [
    { key: "content", type: "object", label: "The file as committed, with its new sha" },
    { key: "commit", type: "object", label: "The commit" },
    { key: "created", type: "boolean", label: "Whether the file had to be created" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const path = String(p.path ?? "").trim().replace(/^\/+/, "");
    if (!path) throw new Error("`path` is required");
    const content = String(p.content ?? "");
    if (!content) throw new Error("`content` is required");

    const client = new GiteaClient(ctx);
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    const url = `/repos/${encodeURIComponent(owner)}/${
      encodeURIComponent(repo)
    }/contents/${encodedPath}`;
    const branch = String(p.branch ?? "").trim();

    // Read first, so an update carries the sha of what it is replacing.
    let sha: string | undefined;
    try {
      const existing = await client.request<{ sha?: string }>(url, {
        query: { ref: branch || undefined },
      });
      sha = Array.isArray(existing) ? undefined : existing?.sha;
    } catch (err) {
      // A file that does not exist yet is a 404, and means "create".
      if (!String((err as Error).message).includes(" 404 ")) throw err;
    }

    const body = compact({
      content: encodeBase64(content),
      message: p.message,
      branch: branch || undefined,
      new_branch: p.newBranch,
      sha,
    });

    ctx.log("info", "committing a Gitea file", { owner, repo, path, creating: !sha });

    const result = await client.request<Record<string, unknown>>(url, {
      method: sha ? "PUT" : "POST",
      body,
    });
    return { ...result, created: !sha };
  },
};

export default action;
