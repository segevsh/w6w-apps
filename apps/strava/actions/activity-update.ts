import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";
import { activityId, summaryActivityOutput } from "../lib/params.ts";

interface Input {
  activityId: string;
  name?: string;
  sportType?: string;
  description?: string;
  gearId?: string;
  trainer?: boolean;
  commute?: boolean;
  hideFromHome?: boolean;
}

/**
 * `PUT /activities/{id}` — update an activity's editable fields
 * (`UpdatableActivity`: `commute`, `description`, `gear_id`, `hide_from_home`,
 * `name`, `sport_type`, `trainer`; the legacy `type` field is omitted in favor
 * of `sport_type`). Needs `activity:write`, and edit access follows the same
 * activity-read scope tier as the activity itself.
 */
const activityUpdate: ActionDefinition<Input> = {
  key: "activity-update",
  type: "perform",
  resource: "activity",
  title: "Update Activity",
  description: "Update an existing activity's editable fields.",
  idempotent: true,
  params: [
    activityId,
    { key: "name", label: "Name", type: "string" },
    {
      key: "sportType",
      label: "Sport type",
      type: "string",
      hint: 'Strava sport type, e.g. "Run", "Ride", "Walk", "Hike".',
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "gearId",
      label: "Gear ID",
      type: "string",
      hint: "'none' clears gear from the activity.",
    },
    { key: "trainer", label: "Trainer activity", type: "boolean" },
    { key: "commute", label: "Commute", type: "boolean" },
    {
      key: "hideFromHome",
      label: "Mute activity",
      type: "boolean",
      hint: "Do not publish to Home or Club feeds.",
    },
  ],
  output: summaryActivityOutput,

  execute(input, ctx) {
    return new StravaClient(ctx).request(`/activities/${input.activityId}`, {
      method: "PUT",
      body: {
        name: input.name,
        sport_type: input.sportType,
        description: input.description,
        gear_id: input.gearId,
        trainer: input.trainer,
        commute: input.commute,
        hide_from_home: input.hideFromHome,
      },
    });
  },
};

export default activityUpdate;
