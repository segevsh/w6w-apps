import type { ActionDefinition } from "@w6w/types";
import { USER, WakaClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v1/users/current/goals` */
const goalList: ActionDefinition<Input> = {
  key: "goal-list",
  type: "read",
  resource: "goal",
  title: "List Goals",
  description: "The user's coding goals with their current progress.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Goals" },
  ],

  execute(_input, ctx) {
    return new WakaClient(ctx).request("GET", `${USER}/goals`);
  },
};

export default goalList;
