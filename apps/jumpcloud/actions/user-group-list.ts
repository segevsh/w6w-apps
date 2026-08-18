import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient, spaced } from "../lib/client.ts";
import { FILTER_PARAMS, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/v2/usergroups` (**V2**) — verified against JumpCloud's V2 OpenAPI
 * document (`groups_user_list`).
 *
 * Note the base path: groups are V2, users are V1. The two APIs also disagree
 * about the envelope — V2 answers a **bare array** where V1 answers
 * `{results, totalCount}` — which the client handles, because an app that knew
 * only one shape would return an empty list here without erroring.
 */
const action: ActionDefinition = {
  key: "user-group-list",
  type: "read",
  resource: "user-group",
  title: "List user groups",
  description: "List user groups. Membership in one is how access is granted.",
  params: [...FILTER_PARAMS, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud user groups", { returnAll, limit });

    return await new JumpCloudClient(ctx).requestAll("/usergroups", {
      api: "v2",
      query: {
        filter: (p.filter as string) || undefined,
        sort: spaced(p.sort),
        fields: spaced(p.fields),
      },
    }, returnAll ? Infinity : limit);
  },
};

export default action;
