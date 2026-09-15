import type { ActionDefinition } from "@w6w/types";
import { MocoClient } from "../lib/client.ts";

interface Input {
  activityId: number;
}

/** `GET /activities/{id}` — verified against `docs.mocoapp.com/api/docs/v1.yaml`. */
const activityGet: ActionDefinition<Input> = {
  key: "activity-get",
  type: "read",
  resource: "activity",
  title: "Get Activity",
  description: "Fetch a single tracked time activity by ID.",
  params: [
    { key: "activityId", label: "Activity ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Activity ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "hours", type: "number", label: "Hours" },
  ],

  execute(input, ctx) {
    return new MocoClient(ctx).request(`/activities/${input.activityId}`);
  },
};

export default activityGet;
