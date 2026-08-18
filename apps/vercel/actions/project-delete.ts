import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v9/projects/{idOrName}` — verified against Vercel's OpenAPI
 * document (`deleteProject`). Vercel answers 204 with no body, so this returns
 * what was deleted.
 */
const action: ActionDefinition = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete a project",
  description: "Permanently delete a project and all of its deployments.",
  idempotent: true,
  params: [TEAM_PARAM, PROJECT_PARAM],
  output: [
    { key: "id", type: "string", label: "Project ID or name" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "deleting Vercel project", { projectId });

    await client.request(`/v9/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
    return { id: projectId, deleted: true };
  },
};

export default action;
