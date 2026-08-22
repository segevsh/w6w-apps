import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `DELETE /v9/projects/{idOrName}/env/{id}` — verified against Vercel's
 * OpenAPI document (`removeProjectEnv`).
 */
const action: ActionDefinition = {
  key: "env-delete",
  type: "perform",
  resource: "env",
  title: "Delete an environment variable",
  description: "Remove an environment variable from a project.",
  idempotent: true,
  params: [
    TEAM_PARAM,
    PROJECT_PARAM,
    { key: "envId", label: "Variable ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Variable ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    const envId = String(p.envId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");
    if (!envId) throw new Error("`envId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "deleting Vercel env var", { projectId, envId });

    await client.request(
      `/v9/projects/${encodeURIComponent(projectId)}/env/${encodeURIComponent(envId)}`,
      { method: "DELETE" },
    );
    return { id: envId, deleted: true };
  },
};

export default action;
