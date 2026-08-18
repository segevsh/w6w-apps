import type { ActionDefinition } from "@w6w/types";
import { HomeAssistantClient } from "../lib/client.ts";

/**
 * `GET /api/calendars` — the calendar entities this instance has.
 *
 * Home Assistant aggregates calendars from wherever they come — Google, CalDAV,
 * a local calendar, an integration's own schedule — into `calendar.*` entities
 * with one shape. That makes it a genuinely useful read surface: one API for
 * calendars that otherwise need four different integrations.
 *
 * It is a plain list of `{entity_id, name}`; the events themselves are
 * `calendar-events`, one entity at a time.
 */
const action: ActionDefinition = {
  key: "calendar-list",
  type: "read",
  resource: "calendar",
  title: "List calendars",
  description:
    "Calendar entities on this instance. Home Assistant normalises Google, CalDAV and local " +
    "calendars into one shape, so this is one API for all of them.",
  params: [],
  output: [
    { key: "calendars", type: "array", label: "Calendar entities" },
    { key: "count", type: "number", label: "How many" },
    { key: "entityIds", type: "array", label: "Just the entity ids" },
  ],

  async execute(_input, ctx) {
    const result = await new HomeAssistantClient(ctx).request<
      Array<{ entity_id?: string; name?: string }>
    >("/calendars");
    const calendars = Array.isArray(result) ? result : [];
    return {
      calendars,
      count: calendars.length,
      entityIds: calendars.map((c) => c?.entity_id).filter(Boolean),
    };
  },
};

export default action;
