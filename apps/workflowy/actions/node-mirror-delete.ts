import type { ActionDefinition } from "@w6w/types";
import { seg, WorkflowyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `DELETE /api/v1/nodes/:id/mirror` — removes the mirror root, leaves the origin; errors if not a mirror. */
const nodeMirrorDelete: ActionDefinition<Input> = {
  key: "node-mirror-delete",
  type: "perform",
  resource: "mirror",
  title: "Delete Mirror",
  description: "Remove a mirror node. The origin node is left intact.",
  idempotent: false,
  params: [{ key: "id", label: "Mirror node ID", type: "string", required: true }],
  output: [{ key: "status", type: "string", label: "Status (ok)" }],

  async execute(input, ctx) {
    return await new WorkflowyClient(ctx).request(`/nodes/${seg(input.id)}/mirror`, {
      method: "DELETE",
    });
  },
};

export default nodeMirrorDelete;
