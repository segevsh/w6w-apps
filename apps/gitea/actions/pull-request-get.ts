import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/pulls/{index}` — verified against Gitea's Swagger
 * document (`repoGetPullRequest`).
 *
 * **`mergeable` is `null` until Gitea has worked it out.** Gitea computes
 * mergeability in the background after a push, so reading this immediately
 * after creating a pull request gives neither `true` nor `false` — and a
 * workflow that treats `null` as "not mergeable" will refuse perfectly good
 * pull requests.
 */
const action: ActionDefinition = {
  key: "pull-request-get",
  type: "read",
  resource: "pull-request",
  title: "Get a pull request",
  description: "Retrieve one pull request, including whether it can be merged.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    { key: "pullNumber", label: "PR Number", type: "number", required: true },
  ],
  output: [
    { key: "number", type: "number", label: "PR number" },
    { key: "title", type: "string", label: "Title" },
    { key: "state", type: "string", label: "open or closed" },
    {
      key: "mergeable",
      type: "boolean",
      label: "Mergeable — null while Gitea is still computing it, not false",
    },
    { key: "merged", type: "boolean", label: "Merged" },
    { key: "head", type: "object", label: "Head branch" },
    { key: "base", type: "object", label: "Base branch" },
    { key: "additions", type: "number", label: "Lines added" },
    { key: "deletions", type: "number", label: "Lines removed" },
    { key: "html_url", type: "string", label: "Web URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const number = Number(p.pullNumber);
    if (!Number.isFinite(number)) throw new Error("`pullNumber` is required");

    ctx.log("info", "getting a Gitea pull request", { owner, repo, number });

    return await new GiteaClient(ctx).request(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${number}`,
    );
  },
};

export default action;
