import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

interface Input {
  status?: "upcoming" | "recurring" | "past" | "cancelled" | "unconfirmed";
  attendeeEmail?: string;
  attendeeName?: string;
  eventTypeId?: number;
  afterStart?: string;
  beforeEnd?: string;
  limit?: number;
  cursor?: string;
}

/**
 * GET /v2/bookings — list bookings, optionally filtered by status, attendee,
 * event type, or a start/end window. `cal-api-version: 2026-05-01` — this
 * list endpoint versions independently of the single-booking endpoints below.
 */
const bookingGetMany: ActionDefinition<Input> = {
  key: "booking-get-many",
  type: "read",
  resource: "booking",
  title: "List Bookings",
  description: "List bookings, optionally filtered by status, attendee, event type or date range.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { label: "Upcoming", value: "upcoming" },
        { label: "Recurring", value: "recurring" },
        { label: "Past", value: "past" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Unconfirmed", value: "unconfirmed" },
      ],
    },
    { key: "attendeeEmail", label: "Attendee email", type: "string" },
    { key: "attendeeName", label: "Attendee name", type: "string" },
    { key: "eventTypeId", label: "Event type ID", type: "number" },
    {
      key: "afterStart",
      label: "Starting after",
      type: "datetime",
      hint: "ISO 8601. Only bookings starting after this instant.",
    },
    {
      key: "beforeEnd",
      label: "Ending before",
      type: "datetime",
      hint: "ISO 8601. Only bookings ending before this instant.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "1–100, default 50.",
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "cursor", label: "Cursor", type: "string", advanced: true },
  ],
  output: [
    { key: "data", type: "array", label: "Bookings" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    return new CalClient(ctx).request("/bookings", {
      headers: { "cal-api-version": CAL_API_VERSION.bookingsList },
      query: {
        status: input.status,
        attendeeEmail: input.attendeeEmail,
        attendeeName: input.attendeeName,
        eventTypeId: input.eventTypeId,
        afterStart: input.afterStart,
        beforeEnd: input.beforeEnd,
        limit: input.limit,
        cursor: input.cursor,
      },
    });
  },
};

export default bookingGetMany;
