import type { ActionDefinition } from "@w6w/types";
import { SnykClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /orgs` — verified against Snyk's own API document (`listOrgs`).
 *
 * How you find the org id every other action wants. It needs no org of its own.
 */
const action: ActionDefinition = {
  key: "org-list",
  type: "read",
  resource: "org",
  title: "List organizations",
  description: "List the organizations this token can see.",
  params: [
    ...LIST_PARAMS,
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      default: "",
      hint: "Only organizations in this group.",
    },
    { key: "slug", label: "Slug", type: "string", default: "" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Snyk organizations", { returnAll, limit });

    return await new SnykClient(ctx).requestAll(
      "/orgs",
      {
        query: {
          group_id: (p.groupId as string) || undefined,
          slug: (p.slug as string) || undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
