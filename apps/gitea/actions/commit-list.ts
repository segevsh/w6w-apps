import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/commits` — verified against Gitea's Swagger
 * document.
 *
 * Answers a bare array, like almost everything here, so the walk stops on a
 * page shorter than the one it asked for.
 */
const action: ActionDefinition = {
  key: "commit-list",
  type: "read",
  resource: "commit",
  title: "List commits",
  description: "List commits on a branch.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "since",
      label: "Since",
      type: "string",
      default: "",
      hint: "ISO 8601 timestamp; only commits after it.",
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Gitea commit records", { owner, repo, returnAll });

    return await new GiteaClient(ctx).requestAll(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits`,
      { query: { since: (p.since as string) || undefined } },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
