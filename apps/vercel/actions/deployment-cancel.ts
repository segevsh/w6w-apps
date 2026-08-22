import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `PATCH /v12/deployments/{id}/cancel` — verified against Vercel's OpenAPI
 * document (`cancelDeployment`). PATCH, not POST, and there is no body.
 */
const action: ActionDefinition = {
  key: "deployment-cancel",
  type: "perform",
  resource: "deployment",
  title: "Cancel a deployment",
  description: "Stop a deployment that is still building.",
  // Cancelling an already-cancelled deployment lands in the same state.
  idempotent: true,
  params: [
    TEAM_PARAM,
    { key: "deploymentId", label: "Deployment ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Deployment ID" },
    { key: "url", type: "string", label: "Deployment URL" },
    { key: "readyState", type: "string", label: "State" },
    { key: "canceledAt", type: "number", label: "Cancelled at (ms)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.deploymentId ?? "").trim();
    if (!id) throw new Error("`deploymentId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "cancelling Vercel deployment", { id });

    return await client.request(`/v12/deployments/${encodeURIComponent(id)}/cancel`, {
      method: "PATCH",
    });
  },
};

export default action;
