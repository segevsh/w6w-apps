import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { resourceOutput } from "../lib/params.ts";

/**
 * Restore an archived project (`PATCH /projects/{id}/restore`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
}

const projectRestore: ActionDefinition<Input> = {
  key: "project-restore",
  type: "perform",
  resource: "project",
  title: "Restore Project",
  description: "Restore an archived project (`PATCH /projects/{id}/restore`).",
  idempotent: true,
  params: [{ key: "id", label: "Project ID", type: "string", required: true }],
  output: resourceOutput("Project"),

  execute(input, ctx) {
    return new ProductiveClient(ctx).one(`/projects/${encodeId(input.id)}/restore`, {
      method: "PATCH",
    });
  },
};

export default projectRestore;
