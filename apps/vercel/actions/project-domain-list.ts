import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { LIST_PARAMS, PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v9/projects/{idOrName}/domains` — verified against Vercel's OpenAPI
 * document (`getProjectDomains`).
 */
const action: ActionDefinition = {
  key: "project-domain-list",
  type: "read",
  resource: "domain",
  title: "List a project's domains",
  description: "List the domains attached to one project.",
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    ...LIST_PARAMS,
    {
      key: "production",
      label: "Production Only",
      type: "boolean",
      default: false,
      hint: "Vercel's `production=true` filter.",
    },
    {
      key: "verified",
      label: "Verified Only",
      type: "boolean",
      default: false,
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "listing Vercel project domains", { projectId, returnAll, limit });

    return await client.requestAll(
      `/v9/projects/${encodeURIComponent(projectId)}/domains`,
      "domains",
      {
        query: {
          // Vercel reads both of these as strings, not booleans.
          production: p.production === true ? "true" : undefined,
          verified: p.verified === true ? "true" : undefined,
        },
      },
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
