import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { TEAM_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v13/deployments/{id}` — verified against Vercel's OpenAPI document
 * (`deleteDeployment`). It answers `{ uid, state }`, and accepts a `url` query
 * param as an alternative to knowing the ID.
 */
const action: ActionDefinition = {
  key: "deployment-delete",
  type: "perform",
  resource: "deployment",
  title: "Delete a deployment",
  description: "Permanently remove a deployment.",
  idempotent: true,
  params: [
    TEAM_PARAM,
    {
      key: "deploymentId",
      label: "Deployment ID",
      type: "string",
      required: true,
      default: "",
      hint: "Pass any ID when using Deployment URL below — Vercel resolves the URL first.",
    },
    {
      key: "url",
      label: "Deployment URL",
      type: "string",
      default: "",
      hint: "Optional. A deployment or alias URL; Vercel resolves the ID from it.",
    },
  ],
  output: [
    { key: "uid", type: "string", label: "Deployment ID" },
    { key: "state", type: "string", label: "State" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.deploymentId ?? "").trim();
    if (!id) throw new Error("`deploymentId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "deleting Vercel deployment", { id });

    return await client.request(`/v13/deployments/${encodeURIComponent(id)}`, {
      method: "DELETE",
      query: { url: (p.url as string) || undefined },
    });
  },
};

export default action;
