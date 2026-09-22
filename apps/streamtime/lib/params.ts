import type { Option, Param } from "@w6w/types";

/**
 * Shared `Param` fragments and option lists.
 *
 * Every enum here is transcribed from Streamtime's own OpenAPI 3.1 document
 * (`https://api.streamtime.net/swagger.json`, fetched 2026-09-22), not inferred
 * from a sibling app or from the marketing site.
 */

/** An entity id — the API uses integers everywhere, including in path segments. */
export function idParam(key: string, label: string, hint?: string): Param {
  return {
    key,
    label,
    type: "number",
    required: true,
    validation: { integer: true, min: 1 },
    ...(hint ? { hint } : {}),
  };
}

/** Same, but optional: an id the vendor treats as nullable. */
export function optionalIdParam(key: string, label: string, hint?: string): Param {
  return {
    key,
    label,
    type: "number",
    validation: { integer: true, min: 0 },
    ...(hint ? { hint } : {}),
  };
}

/**
 * A nested model field, passed through verbatim.
 *
 * Streamtime models its statuses, costing methods and allocation methods as
 * `{ id, name }` objects rather than as enums or ids. The names are configured
 * per organisation, so they cannot be baked into an option list either — a
 * `select` here would be wrong the moment somebody renames a status. The field
 * is a JSON object of the documented shape instead, and the hint states that
 * shape so the caller does not have to guess which half of it matters.
 */
export function modelObjectParam(key: string, label: string, shape: string): Param {
  return {
    key,
    label,
    type: "json",
    hint: `Streamtime object of the form ${shape}. Ids come from GET /search/setup or from ` +
      "the records themselves; `name` is your organisation's own label for it.",
  };
}

/**
 * Accept a `json` param as either a parsed value or the string a user typed.
 *
 * The host hands a `json` param through in whichever shape it arrived, so both
 * are handled here rather than at each call site. An unparseable string is an
 * error rather than a silent drop: quietly sending a body without the status
 * the caller thought they set is worse than failing.
 */
export function asOptionalJson<T = unknown>(value: unknown, label: string): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

/** A date the spec types as `string` with `format: date` (YYYY-MM-DD). */
export function dateParam(key: string, label: string, hint?: string): Param {
  return {
    key,
    label,
    type: "date",
    ...(hint ? { hint } : {}),
  };
}

/**
 * `SearchView` — what `POST /search` and `GET /search/setup` are pointed at.
 *
 * 24 members, transcribed from the schema. Note the asymmetry with
 * {@link REPORT_VIEW_OPTIONS}: time and expenses are searched as `time` and
 * `expenses`, the same words the report uses, but job groups, quotes and
 * invoices are not, and reporting has no `*_line_items` views at all.
 */
export const SEARCH_VIEW_OPTIONS: Option[] = [
  { value: "jobs", label: "Jobs" },
  { value: "job_milestones", label: "Job milestones" },
  { value: "job_phases", label: "Job phases" },
  { value: "job_items", label: "Job items" },
  { value: "job_item_quote_line_items", label: "Job item ↔ quote line items" },
  { value: "job_item_invoice_line_items", label: "Job item ↔ invoice line items" },
  { value: "job_item_users", label: "Job item users (scheduled people)" },
  { value: "job_item_roles", label: "Job item roles" },
  { value: "job_item_sub_items", label: "Job item sub-items" },
  { value: "time", label: "Logged time" },
  { value: "expenses", label: "Logged expenses" },
  { value: "purchase_order_line_items", label: "Purchase order line items" },
  { value: "logged_expense_quote_line_items", label: "Logged expense ↔ quote line items" },
  { value: "logged_expense_invoice_line_items", label: "Logged expense ↔ invoice line items" },
  { value: "quotes", label: "Quotes" },
  { value: "quote_line_items", label: "Quote line items" },
  { value: "quote_line_item_invoice_line_items", label: "Quote line item ↔ invoice line items" },
  { value: "invoices", label: "Invoices" },
  { value: "invoice_line_items", label: "Invoice line items" },
  { value: "job_groups", label: "Job groups" },
  { value: "job_group_periods", label: "Job group periods" },
  { value: "companies", label: "Companies" },
  { value: "contacts", label: "Contacts" },
  { value: "users", label: "Users" },
];

/** `ReportView` — the 12 views `POST /report` and `GET /report/setup` accept. */
export const REPORT_VIEW_OPTIONS: Option[] = [
  { value: "jobs", label: "Jobs" },
  { value: "job_items", label: "Job items" },
  { value: "job_item_users", label: "Job item users (scheduled people)" },
  { value: "job_item_roles", label: "Job item roles" },
  { value: "time", label: "Logged time" },
  { value: "expenses", label: "Logged expenses" },
  { value: "quotes", label: "Quotes" },
  { value: "invoices", label: "Invoices" },
  { value: "job_groups", label: "Job groups" },
  { value: "companies", label: "Companies" },
  { value: "contacts", label: "Contacts" },
  { value: "users", label: "Users" },
];

/** `POST /report` → `statistics[].mode`, the six aggregation modes. */
export const STATISTIC_MODE_OPTIONS: Option[] = [
  { value: "count", label: "Count — `column` is not required" },
  { value: "sum", label: "Sum" },
  { value: "average", label: "Average" },
  { value: "min", label: "Minimum" },
  { value: "max", label: "Maximum" },
  { value: "standard_deviation", label: "Standard deviation" },
];

/**
 * The filter language, copied out of `POST /search`'s own request-body
 * description — Streamtime documents the DSL in prose on that endpoint, not as
 * a schema, and this app exposes it verbatim rather than inventing a query
 * builder that could only express a subset of it.
 */
export const SEARCH_QUERY_HINT =
  "Streamtime's filter expression. Selectors come from GET /search/setup for the chosen view. " +
  "Join filters with AND or OR and group them with parentheses. Operators: =, !=, >, >=, <, <=, " +
  "CONTAINS, NOT CONTAINS, IN, NOT IN. For a list value use IN/NOT IN/CONTAINS/NOT CONTAINS with " +
  'a comma-separated list in square brackets, e.g. job_item_name contains ["Pitch", "account ' +
  'management"]. Examples from the vendor: job_status = "complete" and (job_name contains ' +
  '"Project Management" or job_item_estimated_start_date > "2025-01-01"); job_status in ' +
  '["paused", "in play"] and billable = "true".';

/** `POST /search` → `query`, required. */
export const searchQueryParam: Param = {
  key: "query",
  label: "Query",
  type: "text",
  required: true,
  hint: SEARCH_QUERY_HINT,
};

/**
 * `POST /search` → `limit` / `offset`.
 *
 * The vendor default is 1000 — which is also the documented maximum, and an
 * error above it. 100 is prefilled here: a workflow step that silently returns
 * a thousand records is a footgun, and the vendor's own note says to reach for
 * the report endpoint when aggregates are all that is wanted.
 */
export function searchPageParams(): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 100,
      validation: { integer: true, min: 0, max: 1000 },
      hint:
        "Records per page. Streamtime's default and maximum are both 1000; above 1000 it errors.",
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      default: 0,
      validation: { integer: true, min: 0 },
      hint: "Index of the first record in this page.",
    },
  ];
}
