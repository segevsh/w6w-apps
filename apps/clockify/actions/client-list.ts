import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

interface Input {
  workspaceId: string;
}

/** GET /workspaces/{workspaceId}/clients. Verified against n8n's `Clockify.node.ts`. */
const clientList: ActionDefinition<Input> = {
  key: "client-list",
  type: "search",
  resource: "client",
  title: "List Clients",
  description: "List clients in a workspace.",
  params: [
    { key: "workspaceId", label: "Workspace ID", type: "string", required: true },
  ],
  output: [
    { key: "items", type: "array", label: "Clients" },
  ],

  async execute(input, ctx) {
    const client = new ClockifyClient(ctx);
    const items = await client.request(`/workspaces/${input.workspaceId}/clients`);
    return { items };
  },
};

export default clientList;
