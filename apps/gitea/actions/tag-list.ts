import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/tags` — verified against Gitea's Swagger
 * document.
 *
 * Answers a bare array, like almost everything here, so the walk stops on a
 * page shorter than the one it asked for.
 */
const action: ActionDefinition = {
  key: "tag-list",
  type: "read",
  resource: "tag",
  title: "List tags",
  description: "List a repository's tags.",
  params: [REPO_PARAM, OWNER_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Gitea tag records", { owner, repo, returnAll });

    return await new GiteaClient(ctx).requestAll(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tags`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
