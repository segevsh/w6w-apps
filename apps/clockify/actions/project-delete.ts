import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
  projectId: string;
}

/** DELETE /workspaces/{workspaceId}/projects/{projectId}. */
const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description: "Delete a project.",
  idempotent: true,
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    await client.request(`/workspaces/${input.workspaceId}/projects/${input.projectId}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default projectDelete;
