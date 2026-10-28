import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, preferHeaders } from "../lib/client.ts";
import { bodyContentTypeParam, timeZoneParam } from "../lib/params.ts";

interface Input {
  eventId: string;
  calendarId?: string;
  select?: string[];
  timeZone?: string;
  bodyContentType?: string;
}

/**
 * `GET /me/events/{id}`, or `GET /me/calendars/{cid}/events/{id}`.
 *
 * https://learn.microsoft.com/en-us/graph/api/event-get
 *
 * Requires `Calendars.ReadBasic` at minimum.
 */
const getEvent: ActionDefinition<Input> = {
  key: "get-event",
  type: "read",
  resource: "event",
  title: "Get Event",
  description: "Fetch a single calendar event by id.",
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    {
      key: "calendarId",
      label: "Calendar ID",
      type: "string",
      advanced: true,
      hint: "Only needed when the event is not on the default calendar.",
    },
    {
      key: "select",
      label: "Select fields",
      type: "string",
      repeat: true,
      advanced: true,
      hint: "OData `$select`.",
    },
    timeZoneParam,
    bodyContentTypeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "subject", type: "string", label: "Title" },
    { key: "start", type: "object", label: "Starts" },
    { key: "end", type: "object", label: "Ends" },
    { key: "location", type: "object", label: "Location" },
    { key: "attendees", type: "array", label: "Attendees" },
    { key: "organizer", type: "object", label: "Organizer" },
    { key: "isAllDay", type: "boolean", label: "All-day" },
    { key: "webLink", type: "string", label: "Web link" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const id = encodeURIComponent(input.eventId);
    const path = input.calendarId
      ? `/me/calendars/${encodeURIComponent(input.calendarId)}/events/${id}`
      : `/me/events/${id}`;

    return client.request(path, {
      query: { $select: odataList(input.select) },
      headers: preferHeaders({
        timeZone: input.timeZone,
        bodyContentType: input.bodyContentType,
      }),
    });
  },
};

export default getEvent;
