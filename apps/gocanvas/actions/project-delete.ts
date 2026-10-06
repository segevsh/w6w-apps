import type { ActionDefinition } from "@w6w/types";
import { deleted, encodeId, GoCanvasClient, hardDeleteQuery } from "../lib/client.ts";
import { hardDeleteParam, idParam } from "../lib/params.ts";

interface Input {
  projectId: number;
  hardDelete?: boolean;
}

const projectDelete: ActionDefinition<Input> = {
  key: "project-delete",
  type: "perform",
  resource: "project",
  title: "Delete Project",
  description: "Soft-delete a project, or permanently delete it with Delete permanently.",
  idempotent: true,
  params: [
    idParam("projectId", "Project ID"),
    hardDeleteParam,
  ],
  output: [
    { key: "data", type: "object", label: "The API's confirmation" },
  ],

  async execute(input, ctx) {
    return deleted(
      await new GoCanvasClient(ctx).request(`/projects/${encodeId(input.projectId)}`, {
        method: "DELETE",
        query: hardDeleteQuery(input.hardDelete),
      }),
    );
  },
};

export default projectDelete;
