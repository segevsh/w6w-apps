import type { TriggerDefinition } from "@w6w/types";
import listCalendars from "../actions/list-calendars.ts";
import { newRecords } from "../lib/triggers.ts";

/**
 * `GET /calendars/` takes the location id, an optional `groupId` and `showDrafted`, and returns the
 * location's calendars in one response with no paging
 * (https://marketplace.gohighlevel.com/docs/ghl/calendars/get-calendars, verified 2026-11-10): a
 * small bounded collection. Every check reads it through `list-calendars` (drafts included, as the
 * action does by default) and diffs the ids (`pollSnapshot`, added only).
 */
const newCalendar: TriggerDefinition<{ groupId?: string }> = {
  key: "new-calendar",
  title: "New Calendar",
  description:
    "Checks the connected HighLevel location for calendars created since the last check, optionally within one calendar group. The run gets each new calendar (id, name, type, active flag).",
  params: [
    {
      key: "groupId",
      label: "Calendar group ID",
      type: "string",
      hint: "Only calendars in this group. Leave empty for every calendar.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "locationId", type: "string", label: "Location ID" },
    { key: "groupId", type: "string", label: "Calendar group ID" },
    { key: "isActive", type: "boolean", label: "Active (not a draft)" },
  ],
  sample: {
    id: "sample-calendar-id",
    name: "Discovery call",
    locationId: "sample-location-id",
    groupId: "sample-group-id",
    isActive: true,
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const res = await listCalendars.execute(
      { showDrafted: true, ...(params.groupId ? { groupId: params.groupId } : {}) },
      ctx,
    ) as { calendars?: unknown[] };
    return newRecords({ state, items: res.calendars ?? [], what: "calendar" });
  },
};

export default newCalendar;
