import type { ActionDefinition } from "@w6w/types";
import { CAL_API_VERSION, CalClient } from "../lib/client.ts";

interface Input {
  eventTypeId: number;
  start: string;
  attendeeName: string;
  attendeeTimeZone: string;
  attendeeEmail?: string;
  attendeePhoneNumber?: string;
  attendeeLanguage?: string;
  guests?: string[];
  location?: Record<string, unknown>;
  lengthInMinutes?: number;
  metadata?: Record<string, unknown>;
}

/**
 * POST /v2/bookings — create a booking. `cal-api-version: 2026-02-25`. The
 * event type is addressed by `eventTypeId` here (the API also accepts
 * `eventTypeSlug` + `username`/`teamSlug`, not exposed — one identification
 * path keeps the form simple, and `eventTypeId` is what `event-type-get-many`
 * and `event-type-get` already return).
 */
const bookingCreate: ActionDefinition<Input> = {
  key: "booking-create",
  type: "perform",
  resource: "booking",
  title: "Create Booking",
  description: "Book an event type for an attendee (POST /bookings).",
  idempotent: false,
  params: [
    { key: "eventTypeId", label: "Event Type ID", type: "number", required: true },
    {
      key: "start",
      label: "Start time",
      type: "datetime",
      required: true,
      hint: "ISO 8601, UTC.",
    },
    { key: "attendeeName", label: "Attendee name", type: "string", required: true },
    {
      key: "attendeeTimeZone",
      label: "Attendee time zone",
      type: "string",
      required: true,
      hint: "IANA time zone, e.g. America/New_York.",
    },
    { key: "attendeeEmail", label: "Attendee email", type: "string" },
    { key: "attendeePhoneNumber", label: "Attendee phone number", type: "string" },
    { key: "attendeeLanguage", label: "Attendee language", type: "string", advanced: true },
    {
      key: "guests",
      label: "Guest emails",
      type: "multiselect",
      advanced: true,
      hint: "Additional attendee emails.",
    },
    {
      key: "location",
      label: "Location",
      type: "json",
      advanced: true,
      hint:
        'A location object, e.g. {"type":"attendeeAddress","address":"…"} or {"type":"integration","integration":"cal-video"}. See Cal.com\'s "create a booking" reference for every `type` value.',
    },
    {
      key: "lengthInMinutes",
      label: "Length (minutes)",
      type: "number",
      advanced: true,
      hint: "Override the event type's default duration, if it allows multiple durations.",
    },
    { key: "metadata", label: "Metadata", type: "json", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "Booking" }],

  execute(input, ctx) {
    return new CalClient(ctx).request("/bookings", {
      method: "POST",
      headers: { "cal-api-version": CAL_API_VERSION.bookings },
      body: {
        eventTypeId: input.eventTypeId,
        start: input.start,
        attendee: {
          name: input.attendeeName,
          timeZone: input.attendeeTimeZone,
          email: input.attendeeEmail,
          phoneNumber: input.attendeePhoneNumber,
          language: input.attendeeLanguage,
        },
        guests: input.guests,
        location: input.location,
        lengthInMinutes: input.lengthInMinutes,
        metadata: input.metadata,
      },
    });
  },
};

export default bookingCreate;
