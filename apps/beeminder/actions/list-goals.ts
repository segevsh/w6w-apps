import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, mapGoal, userPath } from "../lib/client.ts";
import { USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  emaciated?: boolean;
}

/** `GET /users/u/goals.json` */
const listGoals: ActionDefinition<Input> = {
  key: "list-goals",
  type: "read",
  resource: "goal",
  title: "List Goals",
  description: "List a user's active goals, most urgent first.",
  params: [
    USERNAME,
    {
      key: "emaciated",
      label: "Strip road fields",
      type: "boolean",
      hint: "Drop the `road`, `roadall` and `fullroad` attributes.",
    },
  ],
  output: [
    { key: "goals", type: "array", label: "Goals (mapped summaries)" },
    { key: "count", type: "number", label: "Number of goals" },
  ],

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(
      `${userPath(input.username)}/goals.json`,
      { query: { emaciated: input.emaciated } },
    );
    const list = Array.isArray(data) ? data : [];
    return { goals: list.map(mapGoal), count: list.length };
  },
};

export default listGoals;
