import type { ActionDefinition } from "@w6w/types";
import { compact, VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `POST /v2/deployments/{id}/aliases` — verified against Vercel's OpenAPI
 * document (`assignAlias`). The response's `oldDeploymentId` names whatever
 * the alias used to point at, which is the thing to keep if you might revert.
 */
const action: ActionDefinition = {
  key: "alias-assign",
  type: "perform",
  resource: "alias",
  title: "Assign an alias to a deployment",
  description: "Point a domain at a deployment.",
  // Re-assigning the same alias to the same deployment is a no-op end state.
  idempotent: true,
  params: [
    TEAM_PARAM,
    {
      key: "deploymentId",
      label: "Deployment ID or URL",
      type: "string",
      required: true,
      default: "",
      hint: "The deployment to assign the alias from.",
    },
    {
      key: "alias",
      label: "Alias",
      type: "string",
      required: true,
      default: "",
      placeholder: "my-app.com",
    },
    {
      key: "redirect",
      label: "Redirect To",
      type: "string",
      default: "",
      hint: "Set to make the alias a redirect instead — it takes precedence over the deployment.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "Alias ID" },
    { key: "alias", type: "string", label: "Alias" },
    { key: "created", type: "string", label: "Created" },
    { key: "oldDeploymentId", type: "string", label: "Previously pointed at" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const deploymentId = String(p.deploymentId ?? "").trim();
    const alias = String(p.alias ?? "").trim();
    if (!deploymentId) throw new Error("`deploymentId` is required");
    if (!alias) throw new Error("`alias` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "assigning Vercel alias", { deploymentId, alias });

    return await client.request(`/v2/deployments/${encodeURIComponent(deploymentId)}/aliases`, {
      method: "POST",
      body: compact({ alias, redirect: p.redirect }),
    });
  },
};

export default action;
