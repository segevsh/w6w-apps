import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { LIST_PARAMS, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v4/aliases` — verified against Vercel's OpenAPI document
 * (`listAliases`). Paged response: `{ aliases: [...], pagination: {...} }`.
 */
const action: ActionDefinition = {
  key: "alias-list",
  type: "read",
  resource: "alias",
  title: "List aliases",
  description: "List aliases, optionally filtered by project or domain.",
  params: [
    TEAM_PARAM,
    ...LIST_PARAMS,
    { key: "projectId", label: "Project ID", type: "string", default: "" },
    {
      key: "domain",
      label: "Domain",
      type: "string",
      default: "",
      hint: "Only aliases of this domain name.",
    },
    { key: "since", label: "Since", type: "number", default: null, hint: "Timestamp (ms)." },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const client = VercelClient.fromConnection(ctx, p.teamId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Vercel aliases", { returnAll, limit });

    return await client.requestAll(
      "/v4/aliases",
      "aliases",
      {
        query: {
          projectId: (p.projectId as string) || undefined,
          domain: (p.domain as string) || undefined,
          since: typeof p.since === "number" ? p.since : undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
