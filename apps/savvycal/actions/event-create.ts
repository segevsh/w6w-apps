import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  linkId: string;
  displayName: string;
  email: string;
  startAt: string;
  endAt: string;
  timeZone: string;
  phoneNumber?: string;
  fields?: unknown;
  metadata?: unknown;
}

const eventCreate: ActionDefinition<Input> = {
  key: "event-create",
  type: "perform",
  resource: "event",
  title: "Create Event",
  description:
    "Book an event on a scheduling link. The start and end must match an available slot — read " +
    "them with Get Link Slots first. Conferencing details may arrive after creation for some " +
    "providers (Zoom).",
  idempotent: false,
  params: [
    {
      key: "linkId",
      label: "Link ID",
      type: "string",
      required: true,
      placeholder: "link_01J5KC2G3MHPCECSQ6KM6FMDPC",
    },
    { key: "displayName", label: "Attendee name", type: "string", required: true },
    { key: "email", label: "Attendee email", type: "string", required: true },
    {
      key: "startAt",
      label: "Start (ISO 8601)",
      type: "string",
      required: true,
      placeholder: "2026-10-20T14:00:00Z",
    },
    {
      key: "endAt",
      label: "End (ISO 8601)",
      type: "string",
      required: true,
      placeholder: "2026-10-20T14:30:00Z",
    },
    {
      key: "timeZone",
      label: "Attendee time zone",
      type: "string",
      required: true,
      placeholder: "America/New_York",
    },
    { key: "phoneNumber", label: "Attendee phone", type: "string" },
    {
      key: "fields",
      label: "Booking-form answers (JSON)",
      type: "json",
      hint: 'Array of {"id","label","type","value"} for the link\'s custom fields.',
    },
    { key: "metadata", label: "Metadata (JSON object)", type: "json" },
  ],
  output: [{ key: "id", type: "string", label: "Event ID" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/links/${encodeId(input.linkId)}/events`, {
      method: "POST",
      body: compact({
        display_name: input.displayName,
        email: input.email,
        start_at: input.startAt,
        end_at: input.endAt,
        time_zone: input.timeZone,
        phone_number: input.phoneNumber,
        fields: asOptionalJson(input.fields, "fields"),
        metadata: asOptionalJson(input.metadata, "metadata"),
      }),
    });
  },
};

export default eventCreate;
