import type { ActionDefinition } from "@w6w/types";
import { sortByPriority, WorkflowyClient, type WorkflowyNode } from "../lib/client.ts";

interface Input {
  parent_id?: string;
}

/**
 * `GET /api/v1/nodes?parent_id=`. The API returns children **unordered**, so
 * this action sorts them by `priority` ascending. Calendar keys 404 until the
 * node exists — create under it first.
 */
const nodeList: ActionDefinition<Input> = {
  key: "node-list",
  type: "read",
  resource: "node",
  title: "List Child Nodes",
  description: "List the children of a node, sorted by their outline order.",
  params: [
    {
      key: "parent_id",
      label: "Parent",
      type: "string",
      default: "None",
      hint: 'Node id, short id, URL, shortcut key, "None" (top level), "inbox", or a calendar key.',
    },
  ],
  output: [
    { key: "nodes", type: "array", label: "Child nodes in outline order" },
    { key: "count", type: "number", label: "Number of nodes" },
  ],

  async execute(input, ctx) {
    const res = await new WorkflowyClient(ctx).request<{ nodes?: WorkflowyNode[] }>("/nodes", {
      query: { parent_id: input.parent_id },
    });
    const nodes = sortByPriority(res.nodes ?? []);
    return { nodes, count: nodes.length };
  },
};

export default nodeList;
