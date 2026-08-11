import type { OutputField, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists for the Housecall Pro actions.
 *
 * Every enum here is copied from Housecall Pro's OpenAPI 3.0 document
 * (`reference/housecall.v1.yaml`, fetched 2026-08-11 from the vendor's
 * Stoplight project), not inferred. Where the vendor documents a different
 * default per endpoint the value is stated at the call site rather than
 * averaged into one wrong number here.
 */

/**
 * The multi-location selector, offered on every action.
 *
 * `docs/franchise.md` says the header applies to "any supported endpoint" and is
 * the recommended replacement for the older `location_ids` query parameter,
 * which the API ignores whenever the header is present. So this app exposes the
 * header and never the query parameter — one control, no silent precedence
 * rule for a user to trip over.
 *
 * Left blank the request runs against the location that owns the credential,
 * which is the API's own default.
 */
export const companyIdParam: Param = {
  key: "companyId",
  label: "Location ID (X-Company-Id)",
  type: "string",
  hint:
    "Multi-location accounts only. The location this request applies to, from the `locations` " +
    "array of the Get Company action. Leave blank to use the location that owns the credential. " +
    "A key reaches its own location and every location beneath it, never a sibling or a parent.",
};

/**
 * `page` / `page_size`, the two parameters on almost every list endpoint.
 *
 * The vendor default for `page_size` is **10** across the board, which is small
 * enough that a workflow reading "all customers" silently reads ten of them.
 * Each call site prefills a larger, explicit value and says so; no maximum is
 * documented anywhere in the reference, so none is asserted here.
 */
export function paginationParams(defaultPageSize = 50, note?: string): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
      hint: "1-based. Read `totalPages` from the result to know when to stop.",
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: defaultPageSize,
      validation: { integer: true, min: 1 },
      hint: note ??
        `Housecall Pro's own default is 10; ${defaultPageSize} is prefilled here. The reference ` +
          "documents no maximum.",
    },
  ];
}

/** `sort_direction`, spelled identically on every endpoint that has it. */
export const sortDirectionParam: Param = {
  key: "sortDirection",
  label: "Sort direction",
  type: "select",
  default: "desc",
  options: [
    { value: "desc", label: "Descending (default)" },
    { value: "asc", label: "Ascending" },
  ],
};

/**
 * `work_status` — the job/estimate list filter.
 *
 * Note that these are **not** the values a job's `work_status` field comes back
 * with. The response enum is `needs scheduling` / `scheduled` / `in progress` /
 * `complete rated` / `complete unrated` / `user canceled` / `pro canceled`
 * (spaces, seven members); the filter enum is `unscheduled` / `scheduled` /
 * `in_progress` / `completed` / `canceled` (underscores, five members). Both are
 * spelled out in the document and feeding a response value back into the filter
 * returns nothing.
 */
export const workStatusFilterOptions = [
  { value: "unscheduled", label: "Unscheduled" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

/** The seven values a Job's own `work_status` field reports. Read-only. */
export const workStatusResponseValues = [
  "needs scheduling",
  "scheduled",
  "in progress",
  "complete rated",
  "complete unrated",
  "user canceled",
  "pro canceled",
];

/**
 * `kind` on a line item.
 *
 * The 2025-10-20 changelog entry removed `tax` from this enum ("not accepted")
 * and confirmed `percent discount` across every line-item schema, so this list
 * is the post-correction one.
 */
export const lineItemKindOptions = [
  { value: "materials", label: "Materials" },
  { value: "labor", label: "Labor" },
  { value: "fixed gratuity", label: "Fixed gratuity" },
  { value: "fixed discount", label: "Fixed discount" },
  { value: "percent discount", label: "Percent discount" },
];

/** `service_item_type` on a line item. */
export const serviceItemTypeOptions = [
  { value: "market_place", label: "Marketplace" },
  { value: "organizational", label: "Organizational" },
  { value: "pricebook_material", label: "Price book material" },
];

/** `status` on a Lead. */
export const leadStatusOptions = [
  { value: "open", label: "Open" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

/** `status` on an Invoice. */
export const invoiceStatusOptions = [
  { value: "open", label: "Open" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "voided", label: "Voided" },
  { value: "uncollectible", label: "Uncollectible" },
  { value: "canceled", label: "Canceled" },
];

/** `payment_method` on an Invoice. */
export const paymentMethodOptions = [
  { value: "credit_card", label: "Credit card" },
  { value: "ach", label: "ACH" },
  { value: "consumer_financing", label: "Consumer financing" },
  { value: "external", label: "External" },
  { value: "mobile_check_deposit", label: "Mobile check deposit" },
];

/** `resource_type` on the pipeline-status list. Required by the API. */
export const pipelineResourceOptions = [
  { value: "lead", label: "Lead" },
  { value: "job", label: "Job" },
  { value: "estimate", label: "Estimate" },
];

/**
 * The list-envelope fields every list action reports.
 *
 * Declared once because all three of the vendor's envelopes are folded into this
 * shape by `normalizeList`, so every list action's `output` really is identical.
 */
export function listOutput(label: string): OutputField[] {
  return [
    { key: "items", type: "array", label },
    { key: "page", type: "number", label: "Page returned" },
    { key: "pageSize", type: "number", label: "Page size" },
    { key: "totalPages", type: "number", label: "Total pages" },
    { key: "totalItems", type: "number", label: "Total matching records" },
  ];
}

/**
 * The note appended to actions whose endpoint refuses a plain Pro API key.
 *
 * Fourteen operations in the reference declare `security` as **only**
 * `Application API Key` or `Housecall User OAuth Token` — a Company API Key, the
 * kind a Pro generates from their own account settings, is not listed. Those
 * endpoints need an integration-partner credential. Saying so in the description
 * is cheaper than a 401 nobody can explain.
 */
export const PARTNER_ONLY_NOTE =
  "Requires an integration-partner credential: the reference lists only the Application API Key " +
  "and OAuth token for this endpoint, not the Company API Key a Pro generates for themselves.";
