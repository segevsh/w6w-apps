import type { ActionDefinition } from "@w6w/types";
import { seg, USER, WakaClient } from "../lib/client.ts";

interface Input {
  goalId: string;
}

/** `GET /api/v1/users/current/goals/${seg(input.goalId)}` */
const goalGet: ActionDefinition<Input> = {
  key: "goal-get",
  type: "read",
  resource: "goal",
  title: "Get Goal",
  description:
    "One goal with its chart data. Cached: an empty goal comes back while the cache fills.",
  params: [
    {
      key: "goalId",
      label: "Goal ID",
      type: "string",
      required: true,
      hint: "The goal's id from List Goals.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "The goal and its chart_data" },
  ],

  execute(input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/goals/${seg(input.goalId)}`);
  },
};

export default goalGet;
