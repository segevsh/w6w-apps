import type { TriggerDefinition } from "@w6w/types";
import listCalendars from "../actions/list-calendars.ts";
import { snapshotAdded } from "../lib/triggers.ts";

/**
 * `GET /me/calendars` — a mailbox has a handful of calendars, so the whole list is read each
 * check (100 per request, 5 requests at most) and compared with the last one.
 * https://learn.microsoft.com/en-us/graph/api/user-list-calendars (verified 2026-11-10).
 */
const newCalendar: TriggerDefinition<Record<string, never>> = {
  key: "new-calendar",
  title: "New Calendar",
  description:
    "Fires when a new calendar appears in the mailbox. The run gets the calendar's id, name, colour and owner.",
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "color", type: "string", label: "Color" },
    { key: "canEdit", type: "boolean", label: "Can edit" },
    { key: "owner.address", type: "string", label: "Owner" },
  ],
  sample: {
    id: "AAMkAGI2...",
    name: "Team Holidays",
    color: "auto",
    canEdit: true,
    owner: { name: "Boss", address: "boss@example.com" },
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return snapshotAdded(listCalendars, {}, state, ctx, "calendars");
  },
};

export default newCalendar;
