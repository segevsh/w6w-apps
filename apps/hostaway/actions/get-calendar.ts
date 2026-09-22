import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, HostawayClient, segment } from "../lib/client.ts";

/**
 * Read a listing's calendar for a date range. Wraps
 * `GET /v1/listings/{listingId}/calendar`.
 *
 * "Calendar is just an array of calendar day objects for dates selected." Documented
 * query parameters:
 *
 *   - `startDate` — date
 *   - `endDate` — date
 *   - `includeResources` — "if includeResources flag is 1 then response objects are
 *     supplied with supplementary resources, default is 0."
 *
 * The docs' "Changing behavior of returning attached objects" section is specific about
 * what `includeResources` buys on THIS endpoint: without it the calendar day objects'
 * `reservations` field "will be always an empty array []". So the hint below says so
 * rather than the vaguer generic wording.
 *
 * Response makes no pagination promise: it is the whole range, as an array.
 */
const action: ActionDefinition = {
  key: "get-calendar",
  type: "read",
  resource: "calendar",
  title: "Get a listing calendar",
  description: "Read a listing's calendar days for a date range.",
  params: [
    { key: "listingId", label: "Listing ID", type: "number", required: true },
    {
      key: "startDate",
      label: "Start date",
      type: "date",
      hint: "Y-m-d. Always send both bounds — the range is not defaulted by the docs.",
    },
    { key: "endDate", label: "End date", type: "date", hint: "Y-m-d, inclusive." },
    {
      key: "includeResources",
      label: "Include reservations",
      type: "boolean",
      hint: "Without this, each calendar day's `reservations` array comes back empty.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Calendar day ID" },
    { key: "listingMapId", type: "number", label: "Listing ID" },
    { key: "date", type: "string", label: "Date" },
    { key: "isAvailable", type: "number", label: "Available (0/1)" },
    { key: "price", type: "number", label: "Price" },
    { key: "minimumStay", type: "number", label: "Minimum stay" },
    { key: "maximumStay", type: "number", label: "Maximum stay" },
    { key: "reservations", type: "array", label: "Reservations (with includeResources)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listingId = asNumber(p.listingId);
    if (listingId === undefined) throw new Error("`listingId` is required");
    return await new HostawayClient(ctx).request(
      `/listings/${segment(listingId)}/calendar`,
      {
        query: {
          startDate: asText(p.startDate),
          endDate: asText(p.endDate),
          includeResources: asNumber(p.includeResources),
        },
      },
    );
  },
};

export default action;
