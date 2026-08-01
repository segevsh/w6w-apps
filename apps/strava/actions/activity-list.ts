import type { ActionDefinition } from "@w6w/types";
import { StravaClient } from "../lib/client.ts";
import { pagination } from "../lib/params.ts";

interface Input {
  before?: number;
  after?: number;
  page?: number;
  perPage?: number;
}

/**
 * `GET /athlete/activities` — the authenticated athlete's activities, most
 * recent first. `before`/`after` are Unix epoch timestamps (Strava's own
 * param type), not ISO strings.
 */
const activityList: ActionDefinition<Input> = {
  key: "activity-list",
  type: "read",
  resource: "activity",
  title: "List Athlete Activities",
  description: "List the authenticated athlete's activities, most recent first.",
  params: [
    {
      key: "before",
      label: "Before (Unix epoch)",
      type: "number",
      hint: "Only return activities before this time.",
    },
    {
      key: "after",
      label: "After (Unix epoch)",
      type: "number",
      hint: "Only return activities after this time.",
    },
    ...pagination,
  ],
  output: [{ key: "activities", type: "array", label: "Activities" }],

  execute(input, ctx) {
    return new StravaClient(ctx).request("/athlete/activities", {
      query: {
        before: input.before,
        after: input.after,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default activityList;
