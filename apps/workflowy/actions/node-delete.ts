import type { ActionDefinition } from "@w6w/types";
import { seg, WorkflowyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `DELETE /api/v1/nodes/:id` — permanent, per the reference ("cannot be undone"). */
const nodeDelete: ActionDefinition<Input> = {
  key: "node-delete",
  type: "perform",
  resource: "node",
  title: "Delete Node",
  description: "Permanently delete a node. This cannot be undone.",
  idempotent: false,
  params: [{ key: "id", label: "Node ID", type: "string", required: true }],
  output: [{ key: "status", type: "string", label: "Status (ok)" }],

  async execute(input, ctx) {
    return await new WorkflowyClient(ctx).request(`/nodes/${seg(input.id)}`, { method: "DELETE" });
  },
};

export default nodeDelete;
