import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/projects/{projectId}/rollback/{deploymentId}` — verified against
 * Vercel's OpenAPI document (`requestRollback`). The schema is explicit that
 * `deploymentId` is "the ID of the deployment to rollback **to**", and
 * `description` (the reason) is a query param, not a body field.
 */
const action: ActionDefinition = {
  key: "deployment-rollback",
  type: "perform",
  resource: "deployment",
  title: "Roll back to a deployment",
  description: "Roll a project's production back to an earlier deployment.",
  idempotent: true,
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    {
      key: "deploymentId",
      label: "Roll Back To (Deployment ID)",
      type: "string",
      required: true,
      default: "",
      hint: "The deployment to roll back TO, not the one being replaced.",
    },
    {
      key: "description",
      label: "Reason",
      type: "string",
      default: "",
      hint: "Recorded with the rollback. Sent as a query param, per Vercel's schema.",
    },
  ],
  output: [
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "deploymentId", type: "string", label: "Rolled back to" },
    { key: "requested", type: "boolean", label: "Rollback requested" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const deploymentId = String(p.deploymentId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!deploymentId) throw new Error("`deploymentId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "rolling back Vercel project", { projectId, deploymentId });

    await client.request(
      `/v1/projects/${encodeURIComponent(projectId)}/rollback/${encodeURIComponent(deploymentId)}`,
      { method: "POST", query: { description: (p.description as string) || undefined } },
    );
    return { projectId, deploymentId, requested: true };
  },
};

export default action;
