import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /v3/projects/{project_id}` — delete a project.
 *
 * Irreversible: also deletes every allocation, logged-time entry and phase
 * on the project.
 */
interface Input {
  project_id: number;
}

const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description:
    "Delete a project. Also deletes its allocations, logged time and phases — irreversible.",
  idempotent: true,
  params: [idParam("project_id", "Project ID")],
  output: [],

  async execute(input, ctx) {
    await new FloatClient(ctx).remove(`/projects/${input.project_id}`);
    return { deleted: true, project_id: input.project_id };
  },
};

export default projectDelete;
