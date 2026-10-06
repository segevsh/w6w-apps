import type { ActionDefinition } from "@w6w/types";
import { TimelinesClient } from "../lib/client.ts";

type Input = Record<string, never>;

const workspaceGet: ActionDefinition<Input> = {
  key: "workspace-get",
  type: "read",
  resource: "workspace",
  title: "Get Workspace",
  description: "Workspace identity, plan and current quota utilisation (GET /workspace).",
  params: [],
  output: [
    {
      key: "data",
      type: "object",
      label:
        "workspace_id, display_name, plan, seats, messaging_quota, api_calls_quota, non_recurring_quota",
    },
  ],

  execute(_input, ctx) {
    return new TimelinesClient(ctx).get("/workspace");
  },
};

export default workspaceGet;
