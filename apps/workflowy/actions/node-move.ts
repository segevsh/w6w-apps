import type { ActionDefinition } from "@w6w/types";
import { compact, seg, WorkflowyClient } from "../lib/client.ts";

interface Input {
  id: string;
  parent_id?: string;
  position?: string;
}

/** `POST /api/v1/nodes/:id/move`. Calendar parents are created on demand. */
const nodeMove: ActionDefinition<Input> = {
  key: "node-move",
  type: "perform",
  resource: "node",
  title: "Move Node",
  description: "Move a node to a new parent, the Inbox or a calendar day.",
  idempotent: true,
  params: [
    { key: "id", label: "Node ID", type: "string", required: true },
    {
      key: "parent_id",
      label: "New parent",
      type: "string",
      required: true,
      hint:
        'Node id, short id, URL, shortcut key, "None" (top level), "inbox", "today", or a calendar key.',
    },
    {
      key: "position",
      label: "Position",
      type: "select",
      default: "top",
      options: [{ value: "top", label: "Top" }, { value: "bottom", label: "Bottom" }],
    },
  ],
  output: [{ key: "status", type: "string", label: "Status (ok)" }],

  async execute(input, ctx) {
    return await new WorkflowyClient(ctx).request(`/nodes/${seg(input.id)}/move`, {
      method: "POST",
      body: compact({ parent_id: input.parent_id, position: input.position }),
    });
  },
};

export default nodeMove;
