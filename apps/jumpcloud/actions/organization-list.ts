import type { ActionDefinition } from "@w6w/types";
import { JumpCloudClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /api/organizations` (V1) — verified against JumpCloud's V1 OpenAPI
 * document (`organization_list`).
 *
 * **This is how you find the id the connection's `x-org-id` needs.** A
 * single-organization account sees exactly one entry here and never needs to
 * set it. An MSP admin key sees several — and without `x-org-id` every other
 * call in this app lands on whichever one JumpCloud treats as the key's
 * default. That call succeeds, against the wrong tenant, which is why this
 * read exists as an action rather than only as a connect-time lookup.
 */
const action: ActionDefinition = {
  key: "organization-list",
  type: "read",
  resource: "organization",
  title: "List organizations",
  description:
    "List the organizations this key can act on — the ids the connection's org field takes.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing JumpCloud organizations", { returnAll, limit });

    return await new JumpCloudClient(ctx).requestAll(
      "/organizations",
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
