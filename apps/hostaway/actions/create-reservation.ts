import type { ActionDefinition } from "@w6w/types";
import { asFlag, asNumber, asText, compact, HostawayClient } from "../lib/client.ts";

/**
 * Create a reservation. Wraps `POST /v1/reservations`.
 *
 * "A reservation object should be provided in the request body." The documented
 * Reservation object is ~100 fields; the required ones (per its own Property table) are
 * only four — `channelId`, `listingMapId`, `arrivalDate`, `departureDate` — plus the
 * server-assigned `id`. `guestName` and `numberOfGuests` are documented as NOT required.
 *
 * Two documented constraints are encoded in the params rather than trusted to the
 * server:
 *
 *   - "Only 2000 (direct), 2002 (homeaway) and 2020 (partner) are supported as channelId
 *     when creating a reservation. Any other value is rejected, including the deprecated
 *     2017 (wordpress)."
 *   - `provider` is a query parameter that "Updates the reservation.source field value
 *     ... The value is limited to 50 characters; longer values are rejected." This
 *     action rejects an over-long value itself rather than spending a round trip on it.
 *   - `forceOverbooking` ("Ignore overbooking protection") and `couponName` are
 *     documented exactly as below: `couponName` goes INSIDE the reservation object and
 *     "it won't affect price, it will only decrement coupon usages".
 *
 * `POST /v1/reservations` has its own documented rate limit of 200 requests per 10
 * seconds per account.
 */
const action: ActionDefinition = {
  key: "create-reservation",
  type: "perform",
  resource: "reservation",
  title: "Create a reservation",
  description: "Create a reservation on one of the account's listings.",
  // Each call creates a new reservation; retrying a failed call books a duplicate.
  idempotent: false,
  params: [
    {
      key: "channelId",
      label: "Channel",
      type: "select",
      required: true,
      options: [
        { value: 2000, label: "Direct (2000)" },
        { value: 2002, label: "HomeAway (2002)" },
        { value: 2020, label: "Partner (2020)" },
      ],
      hint: "Only direct, homeaway and partner are accepted when creating a reservation.",
    },
    { key: "listingMapId", label: "Listing ID", type: "number", required: true },
    { key: "arrivalDate", label: "Arrival date", type: "date", required: true },
    { key: "departureDate", label: "Departure date", type: "date", required: true },
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
    { key: "currency", label: "Currency", type: "string", hint: "ISO currency code, e.g. USD." },
    { key: "cleaningFee", label: "Cleaning fee", type: "number" },
    { key: "taxAmount", label: "Tax amount", type: "number" },
    { key: "isPaid", label: "Paid", type: "boolean" },
    { key: "guestNote", label: "Guest note", type: "text" },
    { key: "hostNote", label: "Host note", type: "text" },
    { key: "comment", label: "Comment", type: "text" },
    { key: "doorCode", label: "Door code", type: "string" },
    {
      key: "couponName",
      label: "Coupon name",
      type: "string",
      hint: "Decrements the coupon's usages only — it does not change the price sent here.",
    },
    {
      key: "forceOverbooking",
      label: "Force overbooking",
      type: "boolean",
      hint: "Ignore overbooking protection.",
    },
    {
      key: "provider",
      label: "Provider",
      type: "string",
      hint: "Sets reservation.source. Maximum 50 characters.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Reservation ID" },
    { key: "listingMapId", type: "number", label: "Listing ID" },
    { key: "channelId", type: "number", label: "Channel ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "guestName", type: "string", label: "Guest name" },
    { key: "arrivalDate", type: "string", label: "Arrival date" },
    { key: "departureDate", type: "string", label: "Departure date" },
    { key: "totalPrice", type: "number", label: "Total price" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const channelId = asNumber(p.channelId);
    const listingMapId = asNumber(p.listingMapId);
    const arrivalDate = asText(p.arrivalDate);
    const departureDate = asText(p.departureDate);
    if (channelId === undefined) throw new Error("`channelId` is required");
    if (listingMapId === undefined) throw new Error("`listingMapId` is required");
    if (!arrivalDate) throw new Error("`arrivalDate` is required");
    if (!departureDate) throw new Error("`departureDate` is required");
    const provider = asText(p.provider);
    if (provider && provider.length > 50) {
      throw new Error("`provider` is limited to 50 characters");
    }

    const body = compact({
      channelId,
      listingMapId,
      arrivalDate,
      departureDate,
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
      couponName: asText(p.couponName),
    });

    return await new HostawayClient(ctx).request("/reservations", {
      method: "POST",
      query: { forceOverbooking: asFlag(p.forceOverbooking), provider },
      body,
    });
  },
};

export default action;
