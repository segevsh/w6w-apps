import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `POST /v10/projects/{projectId}/promote/{deploymentId}` — verified against
 * Vercel's OpenAPI document (`requestPromote`). No body.
 *
 * Promotion makes an existing (already built) deployment the production one,
 * without rebuilding — the "ship the thing we already tested" move.
 */
const action: ActionDefinition = {
  key: "deployment-promote",
  type: "perform",
  resource: "deployment",
  title: "Promote a deployment to production",
  description: "Make an existing deployment the project's production deployment.",
  // Promoting the same deployment twice leaves the same deployment in
  // production.
  idempotent: true,
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    {
      key: "deploymentId",
      label: "Deployment ID",
      type: "string",
      required: true,
      default: "",
      hint: "The deployment to promote to production.",
    },
  ],
  output: [
    { key: "projectId", type: "string", label: "Project ID" },
    { key: "deploymentId", type: "string", label: "Promoted deployment ID" },
    { key: "requested", type: "boolean", label: "Promotion requested" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const deploymentId = String(p.deploymentId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!deploymentId) throw new Error("`deploymentId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "promoting Vercel deployment", { projectId, deploymentId });

    // Vercel answers 20x with no body here, so the request is reported rather
    // than an object that does not exist.
    await client.request(
      `/v10/projects/${encodeURIComponent(projectId)}/promote/${encodeURIComponent(deploymentId)}`,
      { method: "POST" },
    );
    return { projectId, deploymentId, requested: true };
  },
};

export default action;
