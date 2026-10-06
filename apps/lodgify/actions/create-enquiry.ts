import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, compact, LodgifyClient, requireText } from "../lib/client.ts";

/**
 * Create an enquiry. Wraps `POST /v1/reservation/enquiry` ("Creates a new general
 * enquiry"). Body: `arrival`, `departure`, `guest_breakdown`, `property_id`,
 * `room_type_id`, `guest` (`guest_name`, `email`, `phone`, ...), `messages[]`, `status`,
 * `source_text`, `has_privacy_consent`. None is marked required in the document except
 * the guest's name, which is sent as `guest_name.first_name`. Answers 201 with the new
 * enquiry id as a bare integer. The deprecated `people` and `guest.name` are not sent.
 */
const action: ActionDefinition = {
  key: "create-enquiry",
  type: "perform",
  idempotent: false,
  resource: "enquiry",
  title: "Create an enquiry",
  description: "Create a guest enquiry, optionally for a property, dates and party size, with " +
    "an opening message.",
  params: [
    { key: "firstName", label: "Guest first name", type: "string", required: true },
    { key: "lastName", label: "Guest last name", type: "string" },
    { key: "email", label: "Guest email", type: "string" },
    { key: "phone", label: "Guest phone", type: "string" },
    { key: "propertyId", label: "Property ID", type: "number" },
    { key: "roomTypeId", label: "Room type ID", type: "number" },
    { key: "arrival", label: "Arrival", type: "date" },
    { key: "departure", label: "Departure", type: "date" },
    { key: "adults", label: "Adults", type: "number" },
    { key: "children", label: "Children", type: "number" },
    { key: "infants", label: "Infants", type: "number" },
    { key: "pets", label: "Pets", type: "number" },
    { key: "message", label: "Message", type: "text", hint: "Sent as the guest's message." },
    { key: "sourceText", label: "Source text", type: "string" },
  ],
  output: [{ key: "id", type: "number", label: "New enquiry ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const breakdown = compact({
      adults: asNumber(p.adults),
      children: asNumber(p.children),
      infants: asNumber(p.infants),
      pets: asNumber(p.pets),
    });
    const message = asText(p.message);
    const body = compact({
      arrival: asText(p.arrival),
      departure: asText(p.departure),
      guest_breakdown: Object.keys(breakdown).length ? breakdown : undefined,
      property_id: asNumber(p.propertyId),
      room_type_id: asNumber(p.roomTypeId),
      guest: compact({
        guest_name: compact({
          first_name: requireText(p.firstName, "firstName"),
          last_name: asText(p.lastName),
        }),
        email: asText(p.email),
        phone: asText(p.phone),
      }),
      messages: message ? [{ message, type: "Renter" }] : undefined,
      source_text: asText(p.sourceText),
    });
    return await new LodgifyClient(ctx).created("/v1/reservation/enquiry", {
      method: "POST",
      body,
    });
  },
};

export default action;
