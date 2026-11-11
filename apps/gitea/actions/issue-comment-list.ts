import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/issues/{index}/comments` — verified against
 * Gitea's Swagger document (`issueGetComments`).
 *
 * The endpoint documents `since` and `before` (RFC 3339) and NO `page`/`limit`: it answers every
 * comment of the issue in one response, so this action makes ONE request and cuts the result to
 * `limit` unless `returnAll` is set. (It used to walk `page`/`limit` through `requestAll`, which a
 * server that ignores `page` answers with page 1 again, every time.)
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
    {
      key: "since",
      label: "Updated since",
      type: "string",
      default: "",
      hint: "RFC 3339 timestamp; only comments updated after it.",
    },
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

    const out = await new GiteaClient(ctx).request<unknown[]>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${number}/comments`,
      { query: { since: (p.since as string) || undefined } },
    );
    const rows = Array.isArray(out) ? out : [];
    return returnAll ? rows : rows.slice(0, Math.max(1, limit));
  },
};

export default action;
