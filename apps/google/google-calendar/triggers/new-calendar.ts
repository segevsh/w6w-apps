import type { TriggerDefinition } from "@w6w/types";
import { checkNewCalendars } from "../lib/triggers.ts";

/**
 * The calendar list is a small bounded collection (`users/me/calendarList`, ≤ 250 per page), so
 * each check reads all of it and diffs ids against the seeded snapshot.
 */
const newCalendar: TriggerDefinition = {
  key: "new-calendar",
  title: "New Calendar",
  description:
    "The run gets each calendar newly added to the account's calendar list (created, subscribed to or shared with the user).",
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "summary", type: "string", label: "Name" },
    { key: "accessRole", type: "string", label: "Access role" },
    { key: "timeZone", type: "string", label: "Time zone" },
    { key: "primary", type: "boolean", label: "Is the primary calendar" },
  ],
  sample: {
    id: "team@group.calendar.google.com",
    summary: "Team",
    accessRole: "writer",
    timeZone: "Europe/Berlin",
  },
  minIntervalMs: 300_000,
  poll({ state }, ctx) {
    return checkNewCalendars(state, ctx);
  },
};

export default newCalendar;
