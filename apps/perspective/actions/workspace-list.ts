import type { ActionDefinition } from "@w6w/types";
import { PerspectiveClient } from "../lib/client.ts";

/**
 * `GET /v1/workspaces` — every workspace and its campaigns (funnels) for the
 * company tied to the API key. The vendor's recommended first call: the
 * campaign ids it returns are the `funnelId` every other action needs.
 */
const workspaceList: ActionDefinition<Record<string, never>> = {
  key: "workspace-list",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description: "List workspaces and their campaigns (funnels), with each funnel's online status.",
  params: [],
  output: [
    {
      key: "data",
      type: "array",
      label: "Workspaces",
    },
  ],

  async execute(_input, ctx) {
    const data = await new PerspectiveClient(ctx).data<unknown[]>("/workspaces");
    return { data };
  },
};

export default workspaceList;
