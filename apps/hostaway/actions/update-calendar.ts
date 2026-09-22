import type { ActionDefinition } from "@w6w/types";
import { asFlag, asNumber, asText, compact, HostawayClient, segment } from "../lib/client.ts";

/**
 * Update a listing's calendar over a date interval. Wraps
 * `PUT /v1/listings/{listingId}/calendar`.
 *
 * "A calendar day object should be provided in the request body. Additionally starDate
 * and endDate parameters should be specified to define dates interval to update."
 * Response: "An array of affected calendar day objects or error response."
 *
 * The body fields below are the ones the docs' row show in that section's request
 * example: `startDate`, `endDate`, `isAvailable`, `desiredUnitsToSell` (the multi-unit
 * variant), `price`, `minimumStay`, `maximumStay`, `closedOnArrival`,
 * `closedOnDeparture`, `note`. Blocking and unblocking is documented as a field
 * value, not a separate endpoint:
 *
 *   - "Single units set `isAvailable` to 0"
 *   - "Multi-units set `desiredUnitsToSell` to 0"
 *   - `desiredUnitsToSell` — "Number of available units of this day. Regarding this
 *     value we try to calculate how many units we need to block."
 *
 * The docs' separate "Batch calendar update" section is a DIFFERENT endpoint
 * (`PUT /v1/listings/{listingId}/calendarIntervals`) taking an ARRAY of interval
 * objects. It is not built here — see the README — so this action's body is the
 * single-interval object documented above, whose field names are exactly the ones
 * that section's array elements use too.
 */
const action: ActionDefinition = {
  key: "update-calendar",
  type: "perform",
  resource: "calendar",
  title: "Update a listing calendar",
  description: "Update availability, price and stay restrictions for a date interval on one " +
    "listing's calendar.",
  idempotent: true,
  params: [
    { key: "listingId", label: "Listing ID", type: "number", required: true },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      required: true,
      hint: "Y-m-d — together with End date this defines the interval to update.",
    },
    { key: "endDate", label: "End date", type: "date", required: true, hint: "Y-m-d." },
    {
      key: "isAvailable",
      label: "Available",
      type: "boolean",
      hint: "Single-unit blocking: set to 0 (false) to block, 1 (true) to unblock.",
    },
    {
      key: "desiredUnitsToSell",
      label: "Units to sell",
      type: "number",
      hint: "Multi-unit blocking: set to 0 to block. Hostaway calculates the units to block.",
    },
    { key: "price", label: "Price", type: "number" },
    { key: "minimumStay", label: "Minimum stay", type: "number" },
    { key: "maximumStay", label: "Maximum stay", type: "number" },
    { key: "closedOnArrival", label: "Closed on arrival", type: "boolean" },
    { key: "closedOnDeparture", label: "Closed on departure", type: "boolean" },
    { key: "note", label: "Note", type: "string" },
  ],
  output: [
    { key: "id", type: "number", label: "Calendar day ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "isAvailable", type: "number", label: "Available (0/1)" },
    { key: "price", type: "number", label: "Price" },
    { key: "desiredUnitsToSell", type: "number", label: "Units to sell" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listingId = asNumber(p.listingId);
    if (listingId === undefined) throw new Error("`listingId` is required");
    const startDate = asText(p.startDate);
    const endDate = asText(p.endDate);
    if (!startDate || !endDate) throw new Error("`startDate` and `endDate` are both required");

    const body = compact({
      startDate,
      endDate,
      isAvailable: asFlag(p.isAvailable),
      desiredUnitsToSell: asNumber(p.desiredUnitsToSell),
      price: asNumber(p.price),
      minimumStay: asNumber(p.minimumStay),
      maximumStay: asNumber(p.maximumStay),
      closedOnArrival: asFlag(p.closedOnArrival),
      closedOnDeparture: asFlag(p.closedOnDeparture),
      note: asText(p.note),
    });

    return await new HostawayClient(ctx).request(`/listings/${segment(listingId)}/calendar`, {
      method: "PUT",
      body,
    });
  },
};

export default action;
