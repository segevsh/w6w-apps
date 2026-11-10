import { pollFromListAction } from "../../_shared/poll/mod.ts";
import listEvents from "../actions/list-events.ts";

interface Params {
  calendarId?: string;
}

/**
 * `GET /me/events?$orderby=createdDateTime desc` — the same request as List Events. Graph's own
 * $orderby example sorts `/me/events` by `createdDateTime`
 * (https://learn.microsoft.com/en-us/graph/query-parameters, verified 2026-11-10).
 */
export default pollFromListAction<Params>({
  key: "new-event",
  title: "New Calendar Event",
  description:
    "Fires for calendar events newly created in a mailbox calendar. The run gets the event's id, subject, start, end, organizer and link.",
  action: listEvents,
  input: ({ calendarId }) => ({
    calendarId: calendarId || undefined,
    orderby: "createdDateTime desc",
    top: 50,
    all: false,
  }),
  items: (result) => (result as { value?: unknown[] }).value ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [
    {
      key: "calendarId",
      label: "Calendar",
      type: "string",
      hint: "Optional calendar id (from List Calendars). Empty means the default calendar.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Event ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "createdDateTime", type: "string", label: "Created at" },
    { key: "start.dateTime", type: "string", label: "Start" },
    { key: "end.dateTime", type: "string", label: "End" },
    { key: "organizer.emailAddress.address", type: "string", label: "Organizer" },
    { key: "webLink", type: "string", label: "Link" },
  ],
  sample: {
    id: "AAMkAGI2...",
    subject: "Planning",
    createdDateTime: "2026-11-09T12:00:00Z",
    start: { dateTime: "2026-11-12T09:00:00.0000000", timeZone: "UTC" },
    end: { dateTime: "2026-11-12T10:00:00.0000000", timeZone: "UTC" },
    organizer: { emailAddress: { name: "Boss", address: "boss@example.com" } },
    webLink: "https://outlook.office.com/calendar/item/AAMkAGI2...",
  },
  maxPages: 1,
});
