import type { ActionDefinition } from "@w6w/types";
import { GiteaClient, resolveRepo } from "../lib/client.ts";
import { LIST_PARAMS, OWNER_PARAM, REPO_PARAM } from "../lib/params.ts";

/**
 * `GET /repos/{owner}/{repo}/releases` — verified against Gitea's Swagger
 * document (`repoListReleases`).
 *
 * Drafts and prereleases are **included by default**, which is the trap for
 * anything computing "the current version": the newest release may be a draft
 * nobody has published. Both filters are exposed for that reason.
 */
const action: ActionDefinition = {
  key: "release-list",
  type: "read",
  resource: "release",
  title: "List releases",
  description: "List releases — including, unless filtered, drafts and prereleases.",
  params: [
    REPO_PARAM,
    OWNER_PARAM,
    {
      key: "draft",
      label: "Drafts",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Include drafts" },
        { value: "false", label: "Published only" },
        { value: "true", label: "Drafts only" },
      ],
      hint: "The newest release can be an unpublished draft.",
    },
    {
      key: "preRelease",
      label: "Prereleases",
      type: "select",
      default: "",
      options: [
        { value: "", label: "Include prereleases" },
        { value: "false", label: "Stable only" },
        { value: "true", label: "Prereleases only" },
      ],
    },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const { owner, repo } = resolveRepo(ctx.connection, p.repo, p.owner);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Gitea releases", { owner, repo, returnAll });

    return await new GiteaClient(ctx).requestAll(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases`,
      {
        query: {
          draft: (p.draft as string) || undefined,
          "pre-release": (p.preRelease as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
