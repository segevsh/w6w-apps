import type { ActionDefinition } from "@w6w/types";
import { VboutClient } from "../lib/client.ts";

/**
 * `GET /1/goal/lists.json` — Return all conversion goals.
 */
type Input = Record<string, never>;

const goalList: ActionDefinition<Input> = {
  key: "goal-list",
  type: "read",
  resource: "goal",
  title: "List Goals",
  description: "Return all conversion goals.",
  params: [],
  output: [
    { key: "goals", type: "object", label: "Goals: { count, items[] }" },
  ],

  async execute(_input, ctx) {
    return await new VboutClient(ctx).get("goal/lists");
  },
};

export default goalList;
