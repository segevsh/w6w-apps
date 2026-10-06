import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, goalPath } from "../lib/client.ts";
import { SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
}

/** `GET /users/u/goals/g/refresh_graph.json` */
const refreshGraph: ActionDefinition<Input> = {
  key: "refresh-graph",
  type: "perform",
  resource: "goal",
  title: "Refresh Goal Graph",
  description: "Force a refetch of autodata and a graph refresh, like the refresh button on the " +
    "goal page. Asynchronous: returns whether the goal was queued. The vendor asks for " +
    "extreme conservatism with this endpoint.",
  idempotent: true,
  params: [USERNAME, SLUG],
  output: [{ key: "queued", type: "boolean", label: "Goal was queued for refresh" }],

  async execute(input, ctx) {
    const { data } = await new BeeminderClient(ctx).request(
      `${goalPath(input.username, input.slug)}/refresh_graph.json`,
    );
    return { queued: data === true };
  },
};

export default refreshGraph;
