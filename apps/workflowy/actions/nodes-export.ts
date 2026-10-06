import type { ActionDefinition } from "@w6w/types";
import { WorkflowyClient, type WorkflowyNode } from "../lib/client.ts";

/**
 * `GET /api/v1/nodes-export` — every node as a flat list (rebuild the tree from
 * `parent_id`). **Rate limited to 1 request per minute** by the vendor, and the
 * response can be very large; prefer List Child Nodes for anything targeted.
 */
const nodesExport: ActionDefinition<Record<string, never>> = {
  key: "nodes-export",
  type: "read",
  resource: "node",
  title: "Export All Nodes",
  description: "Export the whole outline as a flat list. Limited to 1 request per minute.",
  params: [],
  output: [
    { key: "nodes", type: "array", label: "All nodes, flat, in outline order per parent" },
    { key: "count", type: "number", label: "Number of nodes" },
  ],

  async execute(_input, ctx) {
    const res = await new WorkflowyClient(ctx).request<{ nodes?: WorkflowyNode[] }>(
      "/nodes-export",
    );
    const nodes = res.nodes ?? [];
    return { nodes, count: nodes.length };
  },
};

export default nodesExport;
