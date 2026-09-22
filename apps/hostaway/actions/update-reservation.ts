import type { ActionDefinition } from "@w6w/types";
import { asFlag, asNumber, asText, compact, HostawayClient, segment } from "../lib/client.ts";

/**
 * Update an existing reservation. Wraps `PUT /v1/reservations/{reservationId}`.
 *
 * "A reservation object should be provided in the request body. It's not possible to
 * update the listingMapId of a reservation with this request." That restriction is
 * honoured by simply not exposing `listingMapId` here — moving a reservation to another
 * listing is not something this action pretends to support.
 *
 * Query parameter: `forceOverbooking` — "Ignore overbooking protection".
 * Response: "The updated reservation object or error response."
 *
 * Only the fields below are exposed, each named in the documented Reservation object.
 * Unset ones are dropped rather than sent as `null`, so a caller can change the guest's
 * phone number without restating the price.
 */
const action: ActionDefinition = {
  key: "update-reservation",
  type: "perform",
  resource: "reservation",
  title: "Update a reservation",
  description: "Update one reservation's dates, guests, pricing, notes or door code.",
  idempotent: true,
  params: [
    { key: "reservationId", label: "Reservation ID", type: "number", required: true },
    { key: "arrivalDate", label: "Arrival date", type: "date" },
    { key: "departureDate", label: "Departure date", type: "date" },
    { key: "status", label: "Status", type: "string", hint: "e.g. new, modified, cancelled." },
    { key: "guestName", label: "Guest name", type: "string" },
    { key: "guestFirstName", label: "Guest first name", type: "string" },
    { key: "guestLastName", label: "Guest last name", type: "string" },
    { key: "guestEmail", label: "Guest email", type: "string" },
    { key: "phone", label: "Guest phone", type: "string" },
    { key: "numberOfGuests", label: "Number of guests", type: "number" },
    { key: "adults", label: "Adults", type: "number" },
    { key: "children", label: "Children", type: "number" },
    { key: "infants", label: "Infants", type: "number" },
    { key: "pets", label: "Pets", type: "number" },
    { key: "totalPrice", label: "Total price", type: "number" },
    { key: "currency", label: "Currency", type: "string" },
    { key: "cleaningFee", label: "Cleaning fee", type: "number" },
    { key: "taxAmount", label: "Tax amount", type: "number" },
    { key: "isPaid", label: "Paid", type: "boolean" },
    { key: "guestNote", label: "Guest note", type: "text" },
    { key: "hostNote", label: "Host note", type: "text" },
    { key: "comment", label: "Comment", type: "text" },
    { key: "doorCode", label: "Door code", type: "string" },
    { key: "forceOverbooking", label: "Force overbooking", type: "boolean" },
  ],
  output: [
    { key: "id", type: "number", label: "Reservation ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "arrivalDate", type: "string", label: "Arrival date" },
    { key: "departureDate", type: "string", label: "Departure date" },
    { key: "totalPrice", type: "number", label: "Total price" },
    { key: "updatedOn", type: "string", label: "Last updated" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const reservationId = asNumber(p.reservationId);
    if (reservationId === undefined) throw new Error("`reservationId` is required");

    const body = compact({
      arrivalDate: asText(p.arrivalDate),
      departureDate: asText(p.departureDate),
      status: asText(p.status),
      guestName: asText(p.guestName),
      guestFirstName: asText(p.guestFirstName),
      guestLastName: asText(p.guestLastName),
      guestEmail: asText(p.guestEmail),
      phone: asText(p.phone),
      numberOfGuests: asNumber(p.numberOfGuests),
      adults: asNumber(p.adults),
      children: asNumber(p.children),
      infants: asNumber(p.infants),
      pets: asNumber(p.pets),
      totalPrice: asNumber(p.totalPrice),
      currency: asText(p.currency),
      cleaningFee: asNumber(p.cleaningFee),
      taxAmount: asNumber(p.taxAmount),
      isPaid: asFlag(p.isPaid),
      guestNote: asText(p.guestNote),
      hostNote: asText(p.hostNote),
      comment: asText(p.comment),
      doorCode: asText(p.doorCode),
    });
    if (Object.keys(body).length === 0) {
      throw new Error("Provide at least one field to update");
    }

    return await new HostawayClient(ctx).request(`/reservations/${segment(reservationId)}`, {
      method: "PUT",
      query: { forceOverbooking: asFlag(p.forceOverbooking) },
      body,
    });
  },
};

export default action;
