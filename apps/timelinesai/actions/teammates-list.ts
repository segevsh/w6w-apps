import type { ActionDefinition } from "@w6w/types";
import { TimelinesClient } from "../lib/client.ts";

type Input = Record<string, never>;

const teammatesList: ActionDefinition<Input> = {
  key: "teammates-list",
  type: "read",
  resource: "workspace",
  title: "List Teammates",
  description: "Teammates and teams in the workspace (GET /workspace/teammates).",
  params: [],
  output: [
    {
      key: "data",
      type: "object",
      label: "teams[] and teammates[]: user_id, display_name, email, role, team, status",
    },
  ],

  execute(_input, ctx) {
    return new TimelinesClient(ctx).get("/workspace/teammates");
  },
};

export default teammatesList;
