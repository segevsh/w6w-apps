import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `DELETE /repos/{owner}/{repo}` — verified against Gitea's Swagger document
 * (`repoDelete`).
 *
 * **This is the most destructive call in the app**, and unlike almost
 * everything else in a Git workflow it is not recoverable from a clone: the
 * issues, pull requests, releases, wiki and settings are not in anyone's local
 * copy. Gitea has no trash for repositories.
 *
 * So it requires an explicit confirmation, and it requires the repository to be
 * written as `owner/name` rather than resolved from the connection's default
 * owner — a bare name plus a stale default is exactly how the wrong repository
 * gets deleted.
 */
const action: ActionDefinition = {
  key: "repo-delete",
  type: "perform",
  resource: "repository",
  title: "Delete a repository",
  description: "Permanently delete a repository, its issues, pull requests and releases.",
  idempotent: true,
  params: [
    {
      ...REPO_PARAM,
      hint: "Must be written as `owner/name` — this action does not use the connection's " +
        "default owner.",
    },
    OWNER_PARAM,
    {
      key: "confirm",
      label: "I understand the issues, pull requests and releases go too",
      type: "boolean",
      required: true,
      default: false,
      hint: "Must be on. A clone does not bring any of that back.",
    },
  ],
  output: [
    { key: "repository", type: "string", label: "owner/name" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = String(p.repo ?? "").trim();
    const explicitOwner = String(p.owner ?? "").trim();
    if (!raw.includes("/") && !explicitOwner) {
      throw new Error(
        'name the repository as "owner/name" (or pass `owner`) — deleting must not depend on ' +
          "the connection's default owner",
      );
    }
    const { owner, repo } = resolveRepo(ctx.connection, raw, explicitOwner);
    if (p.confirm !== true) {
      throw new Error("`confirm` must be true — deleting a repository cannot be undone");
    }

    ctx.log("warn", "deleting a Gitea repository", { owner, repo });

    await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { method: "DELETE" },
    );
    return { repository: `${owner}/${repo}`, deleted: true };
  },
};

export default action;
