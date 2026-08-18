import type { ActionDefinition } from "@w6w/types";
import { GiteaClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /orgs/{org}/repos` — verified against Gitea's Swagger document
 * (`orgListRepos`).
 *
 * Everything an organization owns, which `repo-search` only approximates: search
 * matches names, this enumerates. On a large instance it is also the cheaper
 * question.
 */
const action: ActionDefinition = {
  key: "org-repo-list",
  type: "read",
  resource: "repository",
  title: "List an organization's repositories",
  description: "Enumerate everything an organization owns.",
  params: [
    { key: "org", label: "Organization", type: "string", required: true, default: "" },
    ...LIST_PARAMS,
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const org = String(p.org ?? "").trim();
    if (!org) throw new Error("`org` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing a Gitea organization's repositories", { org, returnAll });

    return await new GiteaClient(ctx).requestAll(
      `/orgs/${encodeURIComponent(org)}/repos`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
