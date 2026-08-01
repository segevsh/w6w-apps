import type { ActionDefinition } from "@w6w/types";
import { ClockifyClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** GET /workspaces. Verified live: the exact call n8n's own credential test uses. */
const workspaceList: ActionDefinition<Input> = {
  key: "workspace-list",
  type: "search",
  resource: "workspace",
  title: "List Workspaces",
  description: "List every workspace the credential can see.",
  params: [],
  output: [
    { key: "items", type: "array", label: "Workspaces" },
  ],

  async execute(_input, ctx) {
    const client = new ClockifyClient(ctx);
    const items = await client.request("/workspaces");
    return { items };
  },
};

export default workspaceList;
