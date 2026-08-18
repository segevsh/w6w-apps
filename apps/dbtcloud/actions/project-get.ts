import type { ActionDefinition } from "@w6w/types";
import { DbtCloudClient } from "../lib/client.ts";

/**
 * `GET /api/v3/accounts/{account}/projects/{id}/` — one project.
 *
 * Worth a separate call for `repository` and `connection`: which git repo the
 * models come from, and which warehouse they are built into. Those two answer
 * "where does this data come from" more directly than anything else in the API,
 * which is the question a data-lineage or incident write-up starts with.
 */
const action: ActionDefinition = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get a project",
  description:
    "One project, with the repository its models come from and the warehouse connection they " +
    "are built into.",
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "number", label: "Project ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "repository", type: "object", label: "The git repository" },
    { key: "connection", type: "object", label: "The warehouse connection" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const projectId = String(p.projectId ?? "").trim();
    if (!projectId) throw new Error("`projectId` is required");

    const client = new DbtCloudClient(ctx);
    return await client.request(
      `/api/v3/accounts/${client.accountId}/projects/${encodeURIComponent(projectId)}/`,
    );
  },
};

export default action;
