import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";

interface Input {
  athleteId: string;
}

/**
 * `GET /athletes/{id}/stats` — recent, year-to-date and all-time run/ride/swim
 * totals for an athlete. Strava's docs are explicit that `id` "must match the
 * authenticated athlete" — pass the id from Get Athlete Profile, not an
 * arbitrary athlete's.
 */
const athleteStatsGet: ActionDefinition<Input> = {
  key: "athlete-stats-get",
  type: "read",
  resource: "athlete",
  title: "Get Athlete Stats",
  description:
    "Fetch recent, year-to-date and all-time totals for the authenticated athlete. The athlete ID must match the authenticated athlete's own ID.",
  params: [
    {
      key: "athleteId",
      label: "Athlete ID",
      type: "string",
      required: true,
      hint: "Must be the authenticated athlete's own ID (see Get Athlete Profile).",
    },
  ],
  output: [
    { key: "recent_run_totals", type: "object", label: "Recent run totals" },
    { key: "recent_ride_totals", type: "object", label: "Recent ride totals" },
    { key: "recent_swim_totals", type: "object", label: "Recent swim totals" },
    { key: "ytd_run_totals", type: "object", label: "Year-to-date run totals" },
    { key: "ytd_ride_totals", type: "object", label: "Year-to-date ride totals" },
    { key: "ytd_swim_totals", type: "object", label: "Year-to-date swim totals" },
    { key: "all_run_totals", type: "object", label: "All-time run totals" },
    { key: "all_ride_totals", type: "object", label: "All-time ride totals" },
    { key: "all_swim_totals", type: "object", label: "All-time swim totals" },
  ],

  execute(input, ctx) {
    return new StravaClient(ctx).request(`/athletes/${input.athleteId}/stats`);
  },
};

export default athleteStatsGet;
