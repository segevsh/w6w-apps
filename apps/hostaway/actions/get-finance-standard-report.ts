import type { ActionDefinition } from "@w6w/types";
import { asText, formArray, HostawayClient } from "../lib/client.ts";

/**
 * Retrieve the financial standard report. Wraps `POST /v1/finance/report/standard`.
 *
 * **Requires the account feature.** The docs' Financial Reporting section opens with a
 * flat instruction: "Before using those endpoints please make sure financial reporting
 * feature is enabled for your account". This is a doc-comment, not a runtime check —
 * this app has no way to read that account feature, and an account without it simply
 * gets the documented failure envelope back.
 *
 * Documented request shape, verbatim: "Parameters can be sent using POST form data" —
 * NOT JSON. The docs' own curl example uses `--form` (curl's multipart flag) and the PHP
 * example passes `CURLOPT_POSTFIELDS` as an array, which php-curl only multipart-encodes
 * — so this is `multipart/form-data`, not `application/x-www-form-urlencoded`
 * (`lib/client.ts#requestForm` builds a `FormData` body for exactly that reason):
 *
 *   - `listingMapIds[]` — "Array of Listing IDs"
 *   - `fromDate` / `toDate` — "date string, Y-m-d"
 *   - `dateType` — "Can be one of the following: arrivalDate, departureDate,
 *     reservationDate" (the docs label its type `float`, which is plainly a typo — the
 *     examples send `arrivalDate`)
 *   - `channelIds[]` — "Array of channel ids"
 *   - `statuses[]` — "Array of reservation statuses"
 *   - `format` — "csv" (the only documented value)
 *   - `sortBy` / `sortOrder` — "asc, desc"
 *   - `delimiter` — "comma, tab"
 *
 * Response: "CSV text with report data" — NOT the JSON envelope, so this action returns
 * the raw text under `csv` rather than pretending it is structured data. A form field
 * array is serialized as `listingMapIds[0]=…`, the shape the docs' own `--form`
 * examples use.
 */
const action: ActionDefinition = {
  key: "get-finance-standard-report",
  type: "read",
  resource: "finance",
  title: "Get the financial standard report",
  description: "Download the standard financial report for a date range as CSV. Requires " +
    "financial reporting to be enabled on the account.",
  params: [
    {
      key: "listingMapIds",
      label: "Listing IDs",
      type: "array",
      item: { type: "number" },
      hint: "Array of Listing IDs. Omit for every listing.",
    },
    { key: "fromDate", label: "From date", type: "date", hint: "Y-m-d." },
    { key: "toDate", label: "To date", type: "date", hint: "Y-m-d." },
    {
      key: "dateType",
      label: "Date type",
      type: "select",
      options: [
        { value: "", label: "Hostaway default" },
        { value: "arrivalDate", label: "Arrival date" },
        { value: "departureDate", label: "Departure date" },
        { value: "reservationDate", label: "Reservation date" },
      ],
    },
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "array",
      item: { type: "number" },
    },
    {
      key: "statuses",
      label: "Statuses",
      type: "array",
      item: { type: "string" },
      hint: "Array of reservation statuses, e.g. new, modified, cancelled.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "Field to sort by, e.g. arrivalDate.",
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: [
        { value: "", label: "Hostaway default" },
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
      ],
    },
    {
      key: "delimiter",
      label: "Delimiter",
      type: "select",
      options: [
        { value: "", label: "Hostaway default" },
        { value: "comma", label: "Comma" },
        { value: "tab", label: "Tab" },
      ],
    },
  ],
  output: [
    { key: "csv", type: "string", label: "Report CSV" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const listingMapIds = Array.isArray(p.listingMapIds) ? (p.listingMapIds as number[]) : [];
    const channelIds = Array.isArray(p.channelIds) ? (p.channelIds as number[]) : [];
    const statuses = Array.isArray(p.statuses) ? (p.statuses as string[]) : [];

    const csv = await new HostawayClient(ctx).requestForm("/finance/report/standard", {
      listingMapIds: formArray("listingMapIds", listingMapIds),
      channelIds: formArray("channelIds", channelIds),
      statuses: formArray("statuses", statuses),
      fromDate: asText(p.fromDate),
      toDate: asText(p.toDate),
      dateType: asText(p.dateType),
      format: "csv",
      sortBy: asText(p.sortBy),
      sortOrder: asText(p.sortOrder),
      delimiter: asText(p.delimiter),
    });
    return { csv };
  },
};

export default action;
