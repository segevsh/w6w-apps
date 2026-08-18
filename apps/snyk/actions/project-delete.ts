import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `DELETE /orgs/{org_id}/projects/{project_id}` — verified against Snyk's own
 * API document (`deleteOrgProject`).
 *
 * This removes the project and its issue history from Snyk. It does not touch
 * the repository — and if the target is still connected to an integration,
 * Snyk may re-import the project on the next scan.
 */
const action: ActionDefinition = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete a project",
  description: "Remove a project and its history from Snyk.",
  idempotent: true,
  params: [
    ORG_PARAM,
    { key: "projectId", label: "Project ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "deleting Snyk project", { org, projectId });

    await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}`,
      { method: "DELETE" },
    );
    return { id: projectId, deleted: true };
  },
};

export default action;
