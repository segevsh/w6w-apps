import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/pulls` — verified against Gitea's Swagger
 * document (`repoListPullRequests`).
 *
 * Unlike `issue-list`, this one returns pull requests only — so it is the
 * honest way to count them.
 */
const action: ActionDefinition = {
  key: "pull-request-list",
  type: "read",
  resource: "pull-request",
  title: "List pull requests",
  description: "List a repository's pull requests.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "state",
      label: "State",
      type: "select",
      default: "open",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "sort",
      label: "Sort",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Default" },
        { value: "recentupdate", label: "Recently updated" },
        { value: "leastupdate", label: "Least recently updated" },
        { value: "mostcomment", label: "Most commented" },
        { value: "priority", label: "Priority" },
      ],
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Gitea pull requests", { owner, repo, returnAll });

    return await new GiteaClient(ctx).requestAll(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls`,
      {
        query: {
          state: String(p.state ?? "open"),
          sort: (p.sort as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
