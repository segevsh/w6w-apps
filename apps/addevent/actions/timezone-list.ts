import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import type { AddEventTimezone } from "../lib/schema.ts";

/**
 * `GET /timezones` — every IANA timezone name AddEvent accepts on an event or
 * calendar's `timezone` field, sorted by UTC offset (negative to positive).
 *
 * The one endpoint in this API that needs no credential at all: the OpenAPI
 * document overrides its security requirement with `security: [{}]`, confirmed
 * live on 2026-09-15 (answers `200` with no `Authorization` header). `requiresAuth`
 * is set to `false` so it stays usable even from a workflow with no Connection yet.
 */
const timezoneList: ActionDefinition<Record<string, never>> = {
  key: "timezone-list",
  type: "read",
  resource: "timezone",
  title: "List Timezones",
  description: "List every timezone AddEvent supports, sorted by UTC offset.",
  requiresAuth: false,
  params: [],
  output: [
    { key: "items", type: "array", label: "Timezones" },
  ],

  async execute(_input, ctx) {
    const items = await new AddEventClient(ctx).json<AddEventTimezone[]>("/timezones");
    return { items: items ?? [] };
  },
};

export default timezoneList;
