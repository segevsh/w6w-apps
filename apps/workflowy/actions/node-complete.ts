import type { ActionDefinition } from "@w6w/types";
import { seg, WorkflowyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `POST /api/v1/nodes/:id/complete`. Answers `{"status":"ok"}`. */
const nodeComplete: ActionDefinition<Input> = {
  key: "node-complete",
  type: "perform",
  resource: "node",
  title: "Complete Node",
  description: "Mark a node as completed.",
  idempotent: true,
  params: [{ key: "id", label: "Node ID", type: "string", required: true }],
  output: [{ key: "status", type: "string", label: "Status (ok)" }],

  async execute(input, ctx) {
    return await new WorkflowyClient(ctx).request(`/nodes/${seg(input.id)}/complete`, {
      method: "POST",
    });
  },
};

export default nodeComplete;
