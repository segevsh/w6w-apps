import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/branches` — verified against Gitea's Swagger
 * document.
 *
 * Answers a bare array, like almost everything here, so the walk stops on a
 * page shorter than the one it asked for.
 */
const action: ActionDefinition = {
  key: "branch-list",
  type: "read",
  resource: "branch",
  title: "List branches",
  description: "List a repository's branches, with their protection state.",
  params: [REPO_PARAM, OWNER_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Gitea branch records", { owner, repo, returnAll });

    return await new GiteaClient(ctx).requestAll(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
