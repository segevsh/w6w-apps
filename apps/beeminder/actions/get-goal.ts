import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, goalPath, mapGoal } from "../lib/client.ts";
import { GOAL_OUTPUT, SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  datapoints?: boolean;
  emaciated?: boolean;
}

/** `GET /users/u/goals/g.json` */
const getGoal: ActionDefinition<Input> = {
  key: "get-goal",
  type: "read",
  resource: "goal",
  title: "Get Goal",
  description: "Read one goal: type, rate, derail time, safety buffer, pledge and graph URLs.",
  params: [
    USERNAME,
    SLUG,
    { key: "datapoints", label: "Include datapoints", type: "boolean", default: false },
    {
      key: "emaciated",
      label: "Strip road fields",
      type: "boolean",
      hint: "Drop the `road`, `roadall` and `fullroad` attributes.",
    },
  ],
  output: GOAL_OUTPUT,

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(
      `${goalPath(input.username, input.slug)}.json`,
      { query: { datapoints: input.datapoints, emaciated: input.emaciated } },
    );
    return mapGoal(data);
  },
};

export default getGoal;
