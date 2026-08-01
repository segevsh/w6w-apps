import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  page?: number;
  pageSize?: number;
}

/** GET /workspaces/{workspaceId}/projects. Verified against n8n's `Clockify.node.ts`. */
const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List projects in a workspace.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "pageSize", label: "Page size", type: "number", default: 50 },
  ],
  output: [
    { key: "items", type: "array", label: "Projects" },
  ],

  async execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    const items = await client.request(`/workspaces/${input.workspaceId}/projects`, {
      query: { page: input.page ?? 1, "page-size": input.pageSize ?? 50 },
    });
    return { items };
  },
};

export default projectList;
