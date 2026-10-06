import type { ActionDefinition } from "@w6w/types";
import { asNumber, asText, LodgifyClient } from "../lib/client.ts";

/**
 * List bookings. Wraps `GET /v2/reservations/bookings` (GetAllAsync, "List of
 * bookings"). Documented query: `page`, `size`, `includeCount`, `stayFilter`
 * (Upcoming|Current|Historic|All|ArrivalDate|DepartureDate), `updatedSince`,
 * `includeTransactions`, `includeExternal`, `includeQuoteDetails`, `trash`
 * (False|True|All) and `stayFilterDate` (used with ArrivalDate/DepartureDate).
 * Response: `{count, items[]}`.
 *
 * The deprecated per-room `people` field is left in the response as the vendor sends
 * it; read `guest_breakdown.adults` instead.
 */
const action: ActionDefinition = {
  key: "list-bookings",
  type: "read",
  resource: "booking",
  title: "List bookings",
  description: "List bookings, filtered by stay (upcoming, current, historic, by arrival or " +
    "departure date), update time or trash state.",
  params: [
    { key: "page", label: "Page", type: "number", hint: "Page number, starting at 1." },
    { key: "size", label: "Page size", type: "number", hint: "Items per page." },
    {
      key: "stayFilter",
      label: "Stay filter",
      type: "select",
      options: [
        { value: "Upcoming", label: "Upcoming" },
        { value: "Current", label: "Current" },
        { value: "Historic", label: "Historic" },
        { value: "All", label: "All" },
        { value: "ArrivalDate", label: "Arriving on a date" },
        { value: "DepartureDate", label: "Departing on a date" },
      ],
    },
    {
      key: "stayFilterDate",
      label: "Stay filter date",
      type: "date",
      hint: "The date to match when the stay filter is Arriving/Departing on a date.",
    },
    {
      key: "updatedSince",
      label: "Updated since",
      type: "datetime",
      hint: "Only bookings updated since this date.",
    },
    {
      key: "trash",
      label: "Trash",
      type: "select",
      options: [
        { value: "False", label: "Not in trash" },
        { value: "True", label: "Only in trash" },
        { value: "All", label: "Both" },
      ],
    },
    { key: "includeCount", label: "Include total count", type: "boolean" },
    { key: "includeTransactions", label: "Include transactions", type: "boolean" },
    { key: "includeExternal", label: "Include external bookings", type: "boolean" },
    { key: "includeQuoteDetails", label: "Include quote details", type: "boolean" },
  ],
  output: [
    { key: "count", type: "number", label: "Total bookings (when requested)" },
    { key: "items", type: "array", label: "Bookings" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const on = (v: unknown) => (v === true ? true : undefined);
    return await new LodgifyClient(ctx).request("/v2/reservations/bookings", {
      query: {
        page: asNumber(p.page),
        size: asNumber(p.size),
        stayFilter: asText(p.stayFilter),
        stayFilterDate: asText(p.stayFilterDate),
        updatedSince: asText(p.updatedSince),
        trash: asText(p.trash),
        includeCount: on(p.includeCount),
        includeTransactions: on(p.includeTransactions),
        includeExternal: on(p.includeExternal),
        includeQuoteDetails: on(p.includeQuoteDetails),
      },
    });
  },
};

export default action;
