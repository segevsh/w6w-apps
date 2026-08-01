import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  projectId: string;
}

/** GET /workspaces/{workspaceId}/projects/{projectId}. */
const projectGet: ActionDefinition<Input> = {
  key: "project-get",
  type: "read",
  resource: "project",
  title: "Get Project",
  description: "Get a single project by ID.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Project ID" },
  ],

  execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    return client.request(`/workspaces/${input.workspaceId}/projects/${input.projectId}`);
  },
};

export default projectGet;
