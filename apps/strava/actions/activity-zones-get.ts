import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";
import { activityId } from "../lib/params.ts";

interface Input {
  activityId: string;
}

/**
 * `GET /activities/{id}/zones` — the activity's heart rate and/or power
 * zones, if the athlete has zones configured and the activity has the
 * relevant stream. Requires `activity:read_all` (Strava's own docs note this
 * endpoint is "only available to the owner of the activity").
 */
const activityZonesGet: ActionDefinition<Input> = {
  key: "activity-zones-get",
  type: "read",
  resource: "activity",
  title: "Get Activity Zones",
  description: "Fetch the heart rate and/or power zones for an activity.",
  params: [activityId],
  output: [{ key: "zones", type: "array", label: "Zones" }],

  execute(input, ctx) {
    return new StravaClient(ctx).request(`/activities/${input.activityId}/zones`);
  },
};

export default activityZonesGet;
