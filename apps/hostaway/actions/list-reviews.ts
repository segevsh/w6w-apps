import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, HostawayClient } from "../lib/client.ts";

/**
 * List reviews. Wraps `GET /v1/reviews`.
 *
 * Documented query parameters, verbatim (a subset is exposed here; the endpoint also
 * documents `channelReservationIds`, `listingInternalNames`, `listingExternalNames`,
 * `tags`, `submittedAtStart`/`End` and `departureDateStart`/`End`, which are left out —
 * see the README):
 *
 *   - `listingMapIds` — "Array of Listing IDs"
 *   - `limit` — "Maximum number of items in the list. Defaults to 100, capped at 500."
 *   - `offset` — "Number of items to skip from beginning of the list."
 *   - `sortBy` — one of id, listingMapId, reservationId, autoReviewId,
 *     autoReviewTemplateId, scheduledDateTime, timeDelta, channelId, type, status,
 *     rating, submittedAt, guestName, arrivalDate, departureDate, channelReservationId,
 *     listingInternalName, listingExternalName. "Unrecognised values are ignored."
 *   - `sortOrder` — "Asc or desc. Defaults to desc."
 *   - `reservationId` — "Hostaway reservation ID."
 *   - `type` — "One of: guest-to-host, host-to-guest"
 *   - `statuses` — "awaiting, pending, scheduled, submitted, published, expired"
 *   - `guestName` — "Partial, case-insensitive match against the reservation guest name,
 *     first name or last name."
 *   - `ratingMin` / `ratingMax` — "Lower/Upper bound on rating (0-10)."
 *
 * `listingMapIds` and `statuses` are documented as arrays, so they serialize as
 * repeated `key[]` parameters — the bracket convention Hostaway's own query examples use
 * (`?specialStatus[]=active`, `?attachObjects[]=bookingEngineUrls`).
 */
const action: ActionDefinition = {
  key: "list-reviews",
  type: "search",
  resource: "review",
  title: "List reviews",
  description: "List guest and host reviews, filtered by listing, reservation, type, status " +
    "or rating.",
  params: [
    { key: "limit", label: "Limit", type: "number", hint: "Defaults to 100, capped at 500." },
    { key: "offset", label: "Offset", type: "number", default: 0 },
    {
      key: "listingMapIds",
      label: "Listing IDs",
      type: "array",
      item: { type: "number" },
      hint: "Array of Listing IDs.",
    },
    { key: "reservationId", label: "Reservation ID", type: "number" },
    {
      key: "type",
      label: "Review type",
      type: "select",
      options: [
        { value: "", label: "Any" },
        { value: "guest-to-host", label: "Guest to host" },
        { value: "host-to-guest", label: "Host to guest" },
      ],
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "array",
      item: { type: "string" },
      hint: "Any of: awaiting, pending, scheduled, submitted, published, expired.",
    },
    { key: "guestName", label: "Guest name", type: "string" },
    { key: "ratingMin", label: "Rating from", type: "number", hint: "0-10." },
    { key: "ratingMax", label: "Rating to", type: "number", hint: "0-10." },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "", label: "Hostaway default" },
        { value: "id", label: "Review ID" },
        { value: "submittedAt", label: "Submitted at" },
        { value: "scheduledDateTime", label: "Scheduled at" },
        { value: "rating", label: "Rating" },
        { value: "guestName", label: "Guest name" },
        { value: "arrivalDate", label: "Arrival date" },
        { value: "departureDate", label: "Departure date" },
      ],
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "", label: "Hostaway default (desc)" },
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
  ],
  output: [
    { key: "items", type: "array", label: "Reviews" },
    { key: "count", type: "number", label: "Total matching reviews" },
    { key: "page", type: "number", label: "Page number" },
    { key: "totalPages", type: "number", label: "Total pages" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listingMapIds = Array.isArray(p.listingMapIds)
      ? (p.listingMapIds as unknown[]).map(asNumber).filter((n) => n !== undefined) as number[]
      : [];
    const statuses = Array.isArray(p.statuses)
      ? (p.statuses as unknown[]).map((s) => asText(s)).filter((s) => s !== undefined) as string[]
      : [];
    return await new HostawayClient(ctx).requestPage("/reviews", {
      query: {
        limit: asNumber(p.limit),
        offset: asNumber(p.offset),
        listingMapIds: listingMapIds.length > 0 ? listingMapIds : undefined,
        reservationId: asNumber(p.reservationId),
        type: asText(p.type),
        statuses: statuses.length > 0 ? statuses : undefined,
        guestName: asText(p.guestName),
        ratingMin: asNumber(p.ratingMin),
        ratingMax: asNumber(p.ratingMax),
        sortBy: asText(p.sortBy),
        sortOrder: asText(p.sortOrder),
      },
    });
  },
};

export default action;
