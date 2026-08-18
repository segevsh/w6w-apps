import type { ActionDefinition } from "@w6w/types";
import { VercelClient } from "../lib/client.ts";
import { PROJECT_PARAM, TEAM_PARAM } from "../lib/params.ts";

/**
 * `GET /v9/projects/{idOrName}` — verified against Vercel's OpenAPI document
 * (`getProject`).
 */
const action: ActionDefinition = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get a project",
  description: "Retrieve one project's settings and latest deployments.",
  params: [TEAM_PARAM, PROJECT_PARAM],
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "accountId", type: "string", label: "Account ID" },
    { key: "framework", type: "string", label: "Framework" },
    { key: "buildCommand", type: "string", label: "Build command" },
    { key: "installCommand", type: "string", label: "Install command" },
    { key: "outputDirectory", type: "string", label: "Output directory" },
    { key: "rootDirectory", type: "string", label: "Root directory" },
    { key: "nodeVersion", type: "string", label: "Node version" },
    { key: "createdAt", type: "number", label: "Created at (ms)" },
    { key: "link", type: "object", label: "Git repository link" },
    { key: "latestDeployments", type: "array", label: "Latest deployments" },
    { key: "targets", type: "object", label: "Targets" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const client = VercelClient.fromConnection(ctx, p.teamId);
    ctx.log("info", "getting Vercel project", { projectId });

    return await client.request(`/v9/projects/${encodeURIComponent(projectId)}`);
  },
};

export default action;
