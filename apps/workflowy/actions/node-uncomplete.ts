import type { ActionDefinition } from "@w6w/types";
import { seg, WorkflowyClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `POST /api/v1/nodes/:id/uncomplete`. Answers `{"status":"ok"}`. */
const nodeUncomplete: ActionDefinition<Input> = {
  key: "node-uncomplete",
  type: "perform",
  resource: "node",
  title: "Uncomplete Node",
  description: "Mark a node as not completed again.",
  idempotent: true,
  params: [{ key: "id", label: "Node ID", type: "string", required: true }],
  output: [{ key: "status", type: "string", label: "Status (ok)" }],

  async execute(input, ctx) {
    return await new WorkflowyClient(ctx).request(`/nodes/${seg(input.id)}/uncomplete`, {
      method: "POST",
    });
  },
};

export default nodeUncomplete;
