import type { ActionDefinition } from "@w6w/types";
import { compact, MightyClient, seg } from "../lib/client.ts";

/** `PATCH /events/{id}/` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  id: number;
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  eventType?: string;
  link?: string;
  location?: string;
  timeZone?: string;
  rsvpEnabled?: boolean;
  rsvpClosed?: boolean;
  restrictedEvent?: boolean;
  postInFeed?: boolean;
  frequency?: string;
  interval?: number;
  recurrenceCount?: number;
  recurUntil?: string;
}

const eventUpdate: ActionDefinition<Input> = {
  key: "event-update",
  type: "perform",
  resource: "event",
  title: "Update Event",
  description: "Change an event's details. Only the fields you set are sent.",
  idempotent: true,
  params: [
    {
      key: "id",
      label: "Event ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    { key: "title", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    { key: "startsAt", label: "Starts at", type: "datetime", hint: "ISO 8601." },
    { key: "endsAt", label: "Ends at", type: "datetime", hint: "ISO 8601." },
    {
      key: "eventType",
      label: "Event type",
      type: "string",
      hint:
        "E.g. 'online_meeting', 'local_meetup' (the spec says \"etc.\" and lists no closed set).",
    },
    { key: "link", label: "Link", type: "string", hint: "External event URL." },
    { key: "location", label: "Location", type: "string" },
    { key: "timeZone", label: "Time zone", type: "string", hint: "IANA identifier." },
    { key: "rsvpEnabled", label: "RSVPs enabled", type: "boolean" },
    { key: "rsvpClosed", label: "RSVPs closed", type: "boolean" },
    {
      key: "restrictedEvent",
      label: "Restricted event",
      type: "boolean",
      hint: "Restrict to specific members.",
    },
    { key: "postInFeed", label: "Post in feed", type: "boolean" },
    {
      key: "frequency",
      label: "Recurrence frequency",
      type: "select",
      options: [{ value: "daily", label: "Daily" }, { value: "weekly", label: "Weekly" }, {
        value: "monthly",
        label: "Monthly",
      }, { value: "yearly", label: "Yearly" }],
    },
    {
      key: "interval",
      label: "Recurrence interval",
      type: "number",
      hint: "1 = every period, 2 = every other period.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "recurrenceCount",
      label: "Recurrence count",
      type: "number",
      hint: "How many times the event recurs.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "recurUntil",
      label: "Recur until",
      type: "datetime",
      hint: "End date for the recurrence.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Event post id" },
    { key: "title", type: "string", label: "Title" },
    { key: "description", type: "string", label: "Description" },
    { key: "event_type", type: "string", label: "Event type" },
    { key: "starts_at", type: "string", label: "Start (ISO 8601)" },
    { key: "ends_at", type: "string", label: "End (ISO 8601)" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "location", type: "string", label: "Location" },
    { key: "link", type: "string", label: "External link" },
    { key: "frequency", type: "string", label: "Recurrence frequency" },
    { key: "interval", type: "number", label: "Recurrence interval" },
    { key: "rsvp_enabled", type: "boolean", label: "RSVPs enabled" },
    { key: "rsvp_closed", type: "boolean", label: "RSVPs closed" },
    { key: "permalink", type: "string", label: "Event URL" },
    { key: "created_at", type: "string", label: "Created (ISO 8601)" },
    { key: "updated_at", type: "string", label: "Updated (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new MightyClient(ctx).request(`/events/${seg(input.id)}/`, {
      method: "PATCH",
      body: compact({
        title: input.title,
        description: input.description,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        event_type: input.eventType,
        link: input.link,
        location: input.location,
        time_zone: input.timeZone,
        rsvp_enabled: input.rsvpEnabled,
        rsvp_closed: input.rsvpClosed,
        restricted_event: input.restrictedEvent,
        post_in_feed: input.postInFeed,
        frequency: input.frequency,
        interval: input.interval,
        recurrence_count: input.recurrenceCount,
        recur_until: input.recurUntil,
      }),
    });
  },
};

export default eventUpdate;
