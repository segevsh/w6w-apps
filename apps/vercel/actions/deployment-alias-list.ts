import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v2/deployments/{id}/aliases` — verified against Vercel's OpenAPI
 * document (`listDeploymentAliases`).
 *
 * Different question from `alias-list`: this asks "what does this one
 * deployment answer to", which is what you check after a promote.
 */
const action: ActionDefinition = {
  key: "deployment-alias-list",
  type: "read",
  resource: "alias",
  title: "List a deployment's aliases",
  description: "List the aliases currently pointing at one deployment.",
  params: [
    TEAM_PARAM,
    {
      key: "deploymentId",
      label: "Deployment ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [{ key: "aliases", type: "array", label: "Aliases" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deploymentId = String(p.deploymentId ?? "").trim();
    if (!deploymentId) throw new Error("`deploymentId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "listing Vercel deployment aliases", { deploymentId });

    return await client.request(`/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`);
  },
};

export default action;
