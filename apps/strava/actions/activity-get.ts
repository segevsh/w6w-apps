import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";
import { activityId, summaryActivityOutput } from "../lib/params.ts";

interface Input {
  activityId: string;
  includeAllEfforts?: boolean;
}

/** `GET /activities/{id}` — one activity's full detail. */
const activityGet: ActionDefinition<Input> = {
  key: "activity-get",
  type: "read",
  resource: "activity",
  title: "Get Activity",
  description: "Fetch one activity by ID.",
  params: [
    activityId,
    {
      key: "includeAllEfforts",
      label: "Include all segment efforts",
      type: "boolean",
      default: false,
    },
  ],
  output: summaryActivityOutput,

  execute(input, ctx) {
    return new StravaClient(ctx).request(`/activities/${input.activityId}`, {
      query: { include_all_efforts: input.includeAllEfforts },
    });
  },
};

export default activityGet;
