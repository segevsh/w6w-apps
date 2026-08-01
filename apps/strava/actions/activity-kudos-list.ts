import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";
import { activityId, pagination } from "../lib/params.ts";

interface Input {
  activityId: string;
  page?: number;
  perPage?: number;
}

/** `GET /activities/{id}/kudos` — athletes who gave kudos on an activity. */
const activityKudosList: ActionDefinition<Input> = {
  key: "activity-kudos-list",
  type: "read",
  resource: "activity",
  title: "List Activity Kudos",
  description: "List the athletes who gave kudos on an activity.",
  params: [activityId, ...pagination],
  output: [{ key: "kudoers", type: "array", label: "Kudos" }],

  execute(input, ctx) {
    return new StravaClient(ctx).request(`/activities/${input.activityId}/kudos`, {
      query: { page: input.page, per_page: input.perPage },
    });
  },
};

export default activityKudosList;
