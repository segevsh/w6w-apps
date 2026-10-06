import type { ActionDefinition } from "@w6w/types";
import {
  asNumber,
  asOptionalJson,
  asText,
  compact,
  LodgifyClient,
  requireNumber,
  segment,
} from "../lib/client.ts";

/**
 * Update a booking. Wraps `PUT /v1/reservation/booking/{id}` ("Updates a booking"),
 * whose description warns "not all fields can be updated via this endpoint". The body
 * schema documents `arrival`, `departure`, `property_id`, `rooms[]`, `guest` (with
 * `guest_name`, `email`, `phone`, address fields), `note`, `source_text` and others;
 * this action sends only the fields the caller sets, using the non-deprecated forms
 * (`guest_name.first_name`, `rooms[].guest_breakdown`) the document recommends.
 * Answers 200 with no body.
 */
const action: ActionDefinition = {
  key: "update-booking",
  type: "perform",
  idempotent: true,
  resource: "booking",
  title: "Update a booking",
  description: "Change a booking's dates, property, rooms, guest details or note. Only the " +
    "fields you set are sent, and Lodgify does not allow every field to change.",
  params: [
    { key: "bookingId", label: "Booking ID", type: "number", required: true },
    { key: "arrival", label: "Arrival", type: "date" },
    { key: "departure", label: "Departure", type: "date" },
    { key: "propertyId", label: "Property ID", type: "number" },
    {
      key: "rooms",
      label: "Rooms",
      type: "json",
      hint: 'Replacement rooms: [{"room_type_id": 1, "guest_breakdown": {"adults": 2}}].',
    },
    { key: "firstName", label: "Guest first name", type: "string" },
    { key: "lastName", label: "Guest last name", type: "string" },
    { key: "email", label: "Guest email", type: "string" },
    { key: "phone", label: "Guest phone", type: "string" },
    { key: "note", label: "Note", type: "text" },
    { key: "sourceText", label: "Source text", type: "string" },
  ],
  output: [{ key: "ok", type: "boolean", label: "Updated" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = requireNumber(p.bookingId, "bookingId");
    const guestName = compact({ first_name: asText(p.firstName), last_name: asText(p.lastName) });
    const guest = compact({
      guest_name: Object.keys(guestName).length ? guestName : undefined,
      email: asText(p.email),
      phone: asText(p.phone),
    });
    const body = compact({
      arrival: asText(p.arrival),
      departure: asText(p.departure),
      property_id: asNumber(p.propertyId),
      rooms: asOptionalJson<unknown[]>(p.rooms, "rooms"),
      guest: Object.keys(guest).length ? guest : undefined,
      note: asText(p.note),
      source_text: asText(p.sourceText),
    });
    if (Object.keys(body).length === 0) throw new Error("set at least one field to update");
    return await new LodgifyClient(ctx).command(`/v1/reservation/booking/${segment(id)}`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
