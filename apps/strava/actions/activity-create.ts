import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";
import { summaryActivityOutput } from "../lib/params.ts";

interface Input {
  name: string;
  sportType: string;
  startDateLocal: string;
  elapsedTime: number;
  description?: string;
  distance?: number;
  trainer?: boolean;
  commute?: boolean;
}

/**
 * `POST /activities` — create a manual activity entry (not an upload). Needs
 * `activity:write`. `sport_type` is the current field name; the older `type`
 * field is deprecated and ignored by Strava whenever `sport_type` is present,
 * so this action only sends `sport_type`.
 */
const activityCreate: ActionDefinition<Input> = {
  key: "activity-create",
  type: "perform",
  resource: "activity",
  title: "Create Activity",
  description: "Create a manual activity entry (not a file upload).",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "sportType",
      label: "Sport type",
      type: "string",
      required: true,
      hint: 'Strava sport type, e.g. "Run", "Ride", "Walk", "Hike".',
    },
    {
      key: "startDateLocal",
      label: "Start date (local, ISO 8601)",
      type: "datetime",
      required: true,
    },
    {
      key: "elapsedTime",
      label: "Elapsed time (seconds)",
      type: "number",
      required: true,
      validation: { min: 0, integer: true },
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "distance",
      label: "Distance (meters)",
      type: "number",
      validation: { min: 0 },
    },
    { key: "trainer", label: "Trainer activity", type: "boolean", default: false },
    { key: "commute", label: "Commute", type: "boolean", default: false },
  ],
  output: summaryActivityOutput,

  execute(input, ctx) {
    return new StravaClient(ctx).request("/activities", {
      method: "POST",
      body: {
        name: input.name,
        sport_type: input.sportType,
        start_date_local: input.startDateLocal,
        elapsed_time: input.elapsedTime,
        description: input.description,
        distance: input.distance,
        trainer: input.trainer === true ? 1 : undefined,
        commute: input.commute === true ? 1 : undefined,
      },
    });
  },
};

export default activityCreate;
