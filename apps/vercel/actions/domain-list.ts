import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { LIST_PARAMS, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v5/domains` — verified against Vercel's OpenAPI document
 * (`getDomains`). Paged response: `{ domains: [...], pagination: {...} }`.
 *
 * Account-level domains, not a project's. `project-domain-list` answers the
 * per-project question.
 */
const action: ActionDefinition = {
  key: "domain-list",
  type: "read",
  resource: "domain",
  title: "List domains",
  description: "List the domains on the connection's team or personal account.",
  params: [TEAM_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = VercelClient.fromConnection(ctx, p.teamId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Vercel domains", { returnAll, limit });

    return await client.requestAll("/v5/domains", "domains", {}, returnAll ? Infinity : limit);
  },
};

export default action;
