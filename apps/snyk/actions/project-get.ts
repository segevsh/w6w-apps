import type { ActionDefinition } from "@w6w/types";
import { resolveOrg, SnykClient } from "../lib/client.ts";
import { ORG_PARAM } from "../lib/params.ts";

/**
 * `GET /orgs/{org_id}/projects/{project_id}` — verified against Snyk's own API
 * document (`getOrgProject`).
 */
const action: ActionDefinition = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get a project",
  description: "Retrieve one project's settings and scan metadata.",
  params: [
    ORG_PARAM,
    { key: "projectId", label: "Project ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "data", type: "object", label: "Project" },
    { key: "jsonapi", type: "object", label: "JSON:API metadata" },
    { key: "links", type: "object", label: "Links" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const org = resolveOrg(ctx.connection, p.orgId);
    ctx.log("info", "getting Snyk project", { org, projectId });

    return await new SnykClient(ctx).request(
      `/orgs/${encodeURIComponent(org)}/projects/${encodeURIComponent(projectId)}`,
    );
  },
};

export default action;
