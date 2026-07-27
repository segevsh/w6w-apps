import type { ActionDefinition } from "@w6w/types";
import { TodoistClient } from "../lib/client.ts";

interface Input {
  projectId: string;
}

/**
 * DELETE /projects/{id} — permanently delete a project and all its tasks.
 * Answers 204, so the action reports `{ success: true }`.
 */
const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description: "Permanently delete a project and everything in it.",
  idempotent: true,
  params: [
    { key: "projectId", label: "Project ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new TodoistClient(ctx);
    await client.request(`/projects/${encodeURIComponent(input.projectId)}`, { method: "DELETE" });
    return { success: true };
  },
};

export default projectDelete;
