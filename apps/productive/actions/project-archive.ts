import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Archive a project (`PATCH /projects/{id}/archive`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
}

const projectArchive: ActionDefinition<Input> = {
  key: "project-archive",
  type: "perform",
  resource: "project",
  title: "Archive Project",
  description: "Archive a project (`PATCH /projects/{id}/archive`).",
  idempotent: true,
  params: [{ key: "id", label: "Project ID", type: "string", required: true }],
  output: resourceOutput("Project"),

  execute(input, ctx) {
    return new ProductiveClient(ctx).one(`/projects/${encodeId(input.id)}/archive`, {
      method: "PATCH",
    });
  },
};

export default projectArchive;
