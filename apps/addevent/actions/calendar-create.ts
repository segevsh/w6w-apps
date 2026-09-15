import type { ActionDefinition } from "@w6w/types";
import { AddEventClient } from "../lib/client.ts";
import { type CalendarInput, calendarInputBody, calendarInputParams } from "../lib/params.ts";
import type { AddEventCalendar } from "../lib/schema.ts";

/**
 * `POST /calendars` — create a new calendar.
 *
 * `title` is the only required field. A calendar is the container events live
 * inside — use several to separate events by customer, team or product area.
 */
type Input = CalendarInput;

const calendarCreate: ActionDefinition<Input> = {
  key: "calendar-create",
  type: "perform",
  resource: "calendar",
  title: "Create Calendar",
  description: "Create a new calendar.",
  idempotent: false,
  params: calendarInputParams(true),
  output: [
    { key: "id", type: "string", label: "Calendar ID" },
    { key: "unique_key", type: "string", label: "Public share key" },
    { key: "title", type: "string", label: "Title" },
    { key: "timezone", type: "string", label: "Default timezone" },
    { key: "is_default_calendar", type: "boolean", label: "Is the account's default calendar" },
    { key: "stats", type: "object", label: "Subscriber and event counts" },
    { key: "link_long", type: "string", label: "Public calendar page URL" },
    { key: "link_short", type: "string", label: "Short public calendar page URL" },
    { key: "created", type: "string", label: "Created at" },
    { key: "modified", type: "string", label: "Modified at" },
  ],

  execute(input, ctx) {
    return new AddEventClient(ctx).json<AddEventCalendar>("/calendars", {
      method: "POST",
      body: calendarInputBody(input),
    });
  },
};

export default calendarCreate;
