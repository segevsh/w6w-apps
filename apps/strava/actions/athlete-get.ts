import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /athlete` — the authenticated athlete's profile. Fields beyond the
 * summary (city, weight, FTP, follower counts, …) require `profile:read_all`;
 * without it Strava silently returns the smaller `SummaryAthlete` shape rather
 * than an error, so a thin credential degrades quietly instead of failing.
 */
const athleteGet: ActionDefinition<Input> = {
  key: "athlete-get",
  type: "read",
  resource: "athlete",
  title: "Get Athlete Profile",
  description: "Fetch the authenticated athlete's profile.",
  params: [],
  output: [
    { key: "id", type: "number", label: "Athlete ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "firstname", type: "string", label: "First name" },
    { key: "lastname", type: "string", label: "Last name" },
    { key: "city", type: "string", label: "City" },
    { key: "country", type: "string", label: "Country" },
    { key: "sex", type: "string", label: "Sex" },
    { key: "profile", type: "string", label: "Profile photo URL" },
  ],

  execute(_input, ctx) {
    return new StravaClient(ctx).request("/athlete");
  },
};

export default athleteGet;
