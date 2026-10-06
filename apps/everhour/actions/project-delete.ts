import type { ActionDefinition } from "@w6w/types";
import { encodeId, EverhourClient } from "../lib/client.ts";

/**
 * `DELETE /projects/{projectId}` — Delete a project.
 *
 * Verified against the Everhour API Blueprint (`everhour.apib`, fetched 2026-10-06).
 */
interface Input {
  projectId: string;
}

const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description: "Delete a project.",
  idempotent: true,
  params: [
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      required: true,
      hint:
        "Everhour project id: `ev:1234567890` for a native project, or `{platform}:{id}` such as `as:123456` for an integration project.",
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when the delete succeeded" },
  ],

  execute(input, ctx) {
    return new EverhourClient(ctx).one(`/projects/${encodeId(input.projectId)}`, {
      method: "DELETE",
    });
  },
};

export default projectDelete;
