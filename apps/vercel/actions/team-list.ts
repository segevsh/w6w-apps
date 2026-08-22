import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /v2/teams` — verified against Vercel's OpenAPI document (`getTeams`).
 * Paged response: `{ teams: [...], pagination: {...} }`.
 *
 * The one action that takes no team scope: it is how you find the `teamId`
 * every other action can be pointed at. Vercel's schema declares no `teamId`
 * parameter on it at all.
 */
const action: ActionDefinition = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List teams",
  description: "List the teams this connection belongs to.",
  params: [...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    // Deliberately not `fromConnection`: this endpoint takes no team scope.
    const client = new VercelClient(ctx);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Vercel teams", { returnAll, limit });

    return await client.requestAll("/v2/teams", "teams", {}, returnAll ? Infinity : limit);
  },
};

export default action;
