import type { ActionDefinition } from "@w6w/types";
import {
  asNumber,
  asOptionalJson,
  asText,
  compact,
  LodgifyClient,
  requireNumber,
  requireText,
} from "../lib/client.ts";

/**
 * Create a booking. Wraps `POST /v1/reservation/booking` ("Creates a new booking"). The
 * `from` query parameter upgrades an existing enquiry, preserving its message history.
 * Body (CreateBookingDto): `arrival`, `departure`, `property_id`, `status`
 * (Open|Booked|Declined|Tentative), `rooms[]` (each REQUIRES `guest_breakdown`),
 * `guest` (REQUIRES `guest_name`), `source_text`, `currency_code`, `total`, `messages[]`,
 * `bookability`, `payment_type`, `origin`, `thread_id`. Answers 201 with the new booking
 * id as a bare integer.
 *
 * The deprecated `people` room field and `guest.name` are not sent: the document points
 * at `guest_breakdown.adults` and `guest_name.first_name` instead.
 *
 * Not idempotent: calling twice creates two bookings.
 */
const action: ActionDefinition = {
  key: "create-booking",
  type: "perform",
  idempotent: false,
  resource: "booking",
  title: "Create a booking",
  description: "Create a booking for a property and room type, optionally upgrading an " +
    "existing enquiry.",
  params: [
    { key: "propertyId", label: "Property ID", type: "number", required: true },
    { key: "arrival", label: "Arrival", type: "date", required: true },
    { key: "departure", label: "Departure", type: "date", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "Open", label: "Open" },
        { value: "Booked", label: "Booked" },
        { value: "Tentative", label: "Tentative" },
        { value: "Declined", label: "Declined" },
      ],
    },
    { key: "firstName", label: "Guest first name", type: "string", required: true },
    { key: "lastName", label: "Guest last name", type: "string" },
    { key: "email", label: "Guest email", type: "string" },
    { key: "phone", label: "Guest phone", type: "string" },
    { key: "countryCode", label: "Guest country code", type: "string" },
    { key: "roomTypeId", label: "Room type ID", type: "number", hint: "For a single room." },
    { key: "adults", label: "Adults", type: "number", hint: "For a single room.", default: 1 },
    { key: "children", label: "Children", type: "number" },
    { key: "infants", label: "Infants", type: "number" },
    { key: "pets", label: "Pets", type: "number" },
    {
      key: "rooms",
      label: "Rooms (advanced)",
      type: "json",
      hint: 'Overrides the single-room fields: [{"room_type_id": 1, "guest_breakdown": ' +
        '{"adults": 2, "children": 0, "infants": 0, "pets": 0}}].',
    },
    { key: "currencyCode", label: "Currency code", type: "string", hint: "e.g. EUR." },
    { key: "total", label: "Total amount", type: "number" },
    { key: "sourceText", label: "Source text", type: "string" },
    {
      key: "enquiryId",
      label: "Upgrade enquiry ID",
      type: "number",
      hint: "Upgrade this enquiry to a booking, keeping its message history.",
    },
  ],
  output: [{ key: "id", type: "number", label: "New booking ID" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    let rooms = asOptionalJson<unknown[]>(p.rooms, "rooms");
    if (rooms === undefined) {
      rooms = [{
        room_type_id: requireNumber(p.roomTypeId, "roomTypeId (or `rooms`)"),
        guest_breakdown: compact({
          adults: asNumber(p.adults) ?? 1,
          children: asNumber(p.children),
          infants: asNumber(p.infants),
          pets: asNumber(p.pets),
        }),
      }];
    }
    const body = compact({
      arrival: requireText(p.arrival, "arrival"),
      departure: requireText(p.departure, "departure"),
      property_id: requireNumber(p.propertyId, "propertyId"),
      status: asText(p.status),
      rooms,
      guest: compact({
        guest_name: compact({
          first_name: requireText(p.firstName, "firstName"),
          last_name: asText(p.lastName),
        }),
        email: asText(p.email),
        phone: asText(p.phone),
        country_code: asText(p.countryCode),
      }),
      currency_code: asText(p.currencyCode),
      total: asNumber(p.total),
      source_text: asText(p.sourceText),
    });
    return await new LodgifyClient(ctx).created("/v1/reservation/booking", {
      method: "POST",
      query: { from: asNumber(p.enquiryId) },
      body,
    });
  },
};

export default action;
