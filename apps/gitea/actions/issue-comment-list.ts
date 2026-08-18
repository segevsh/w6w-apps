import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/issues/{index}/comments` — verified against
 * Gitea's Swagger document (`issueGetComments`).
 *
 * Conversation comments only. Gitea records state changes, label edits and
 * assignments as their own timeline events on a different endpoint, so a
 * comment count here will not match the activity shown in the web UI.
 */
const action: ActionDefinition = {
  key: "issue-comment-list",
  type: "read",
  resource: "issue",
  title: "List comments",
  description: "List an issue's or pull request's conversation comments.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "issueNumber", label: "Issue or PR Number", type: "number", required: true },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const number = Number(p.issueNumber);
    if (!Number.isFinite(number)) throw new Error("`issueNumber` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Gitea issue comments", { owner, repo, number });

    return await new GiteaClient(ctx).requestAll(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/comments`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
