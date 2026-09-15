import type { ActionDefinition } from "@w6w/types";
import { dataEnvelope, flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  eventId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  guestsCount?: number;
  volunteer?: boolean;
}

/**
 * `POST /api/v2/event_rsvps` — confirmed against the vendor's OpenAPI spec.
 * Unlike events, an RSVP takes the attendee's name/email/phone directly —
 * NationBuilder matches or creates the underlying person record itself.
 */
const eventRsvpCreate: ActionDefinition<Input> = {
  key: "event-rsvp-create",
  type: "perform",
  resource: "event",
  title: "RSVP to Event",
  description: "RSVP a person to an event by name/email.",
  idempotent: false,
  params: [
    { key: "eventId", label: "Event ID", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string" },
    { key: "guestsCount", label: "Number of guests", type: "number" },
    { key: "volunteer", label: "Volunteering at this event", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "RSVP ID" },
    { key: "event_id", type: "string", label: "Event ID" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/event_rsvps", {
      method: "POST",
      body: dataEnvelope("event_rsvps", {
        event_id: input.eventId,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        phone_number: input.phoneNumber,
        guests_count: input.guestsCount,
        volunteer: input.volunteer,
      }),
    });
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default eventRsvpCreate;
