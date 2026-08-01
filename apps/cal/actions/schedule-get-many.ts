import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

/**
 * GET /v2/schedules — every availability schedule owned by the authenticated
 * user. Takes no query parameters. `cal-api-version: 2024-06-11`.
 */
const scheduleGetMany: ActionDefinition<Record<string, never>> = {
  key: "schedule-get-many",
  type: "read",
  resource: "schedule",
  title: "List Schedules",
  description: "List the authenticated user's availability schedules.",
  params: [],
  output: [{ key: "data", type: "array", label: "Schedules" }],

  execute(_input, ctx) {
    return new CalClient(ctx).request("/schedules", {
      headers: { "cal-api-version": CAL_API_VERSION.schedules },
    });
  },
};

export default scheduleGetMany;
