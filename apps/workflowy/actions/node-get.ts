import type { ActionDefinition } from "@w6w/types";
import { seg, WorkflowyClient, type WorkflowyNode } from "../lib/client.ts";

interface Input {
  id: string;
}

/** `GET /api/v1/nodes/:id`. Calendar keys resolve existing nodes only; they never create. */
const nodeGet: ActionDefinition<Input> = {
  key: "node-get",
  type: "read",
  resource: "node",
  title: "Get Node",
  description: "Fetch one node by id, short id, or calendar key such as today.",
  params: [
    {
      key: "id",
      label: "Node ID",
      type: "string",
      required: true,
      hint:
        'Full id, 12-character short id, or "calendar", "today", "tomorrow", "next_week", YYYY, YYYY-MM, YYYY-MM-DD.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Node ID" },
    { key: "parent_id", type: "string", label: "Parent ID (null at top level)" },
    { key: "name", type: "string", label: "Text (inline HTML)" },
    { key: "note", type: "string", label: "Note" },
    { key: "priority", type: "number", label: "Sort order among siblings" },
    { key: "completed", type: "boolean", label: "Completed" },
    { key: "data", type: "object", label: "Layout data" },
    { key: "createdAt", type: "number", label: "Created (unix seconds)" },
    { key: "modifiedAt", type: "number", label: "Modified (unix seconds)" },
    { key: "completedAt", type: "number", label: "Completed at (unix seconds)" },
  ],

  async execute(input, ctx) {
    const res = await new WorkflowyClient(ctx).request<{ node?: WorkflowyNode }>(
      `/nodes/${seg(input.id)}`,
    );
    if (!res.node) throw new Error("Workflowy returned no node");
    return res.node;
  },
};

export default nodeGet;
