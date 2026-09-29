import type { ActionDefinition } from "@w6w/types";
import { RedtailClient } from "../lib/client.ts";
import type { RedtailActivity } from "../lib/types.ts";

interface Input {
  activityId: number;
}

interface Output {
  activity: RedtailActivity;
}

const activityGet: ActionDefinition<Input, Output> = {
  key: "activity-get",
  type: "read",
  resource: "activity",
  title: "Get Activity",
  description: "Get a single activity by id.",
  params: [
    { key: "activityId", label: "Activity ID", type: "number", required: true },
  ],
  output: [
    { key: "activity.id", type: "number", label: "Activity ID" },
    { key: "activity.subject", type: "string", label: "Subject" },
    { key: "activity.start_date", type: "string", label: "Start date" },
    { key: "activity.percentdone", type: "number", label: "Percent complete" },
  ],

  async execute(input, ctx) {
    const res = await new RedtailClient(ctx).request<Output>(`/activities/${input.activityId}`);
    return res.data;
  },
};

export default activityGet;
