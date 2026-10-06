import type { Option, Param } from "@w6w/types";
import { asOptionalJson, compact } from "./client.ts";

/** Lob's `limit`: 1..100, default 10. */
export function paginationParams(defaultLimit = 10): Param[] {
  return [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: defaultLimit,
      validation: { min: 1, max: 100, integer: true },
      hint: "1 to 100. Lob's own default is 10.",
    },
    {
      key: "after",
      label: "After (cursor)",
      type: "string",
      advanced: true,
      hint:
        "The `nextCursor` from a previous page. Only one of After and Before may be used at a time.",
    },
    {
      key: "before",
      label: "Before (cursor)",
      type: "string",
      advanced: true,
      hint: "The `previousCursor` from a previous page.",
    },
    {
      key: "includeTotal",
      label: "Include total count",
      type: "boolean",
      advanced: true,
      hint: "Adds `totalCount` to the result (Lob's `include[]=total_count`).",
    },
  ];
}

export const filterParams: Param[] = [
  {
    key: "dateCreated",
    label: "Date created filter",
    type: "json",
    advanced: true,
    hint: 'Object with gt/gte/lt/lte ISO-8601 dates, e.g. {"gt":"2026-01-01","lt":"2026-02-01"}.',
  },
  {
    key: "metadata",
    label: "Metadata filter",
    type: "json",
    advanced: true,
    hint: 'Key/value pairs to match, e.g. {"campaign":"NEWYORK2015"}.',
  },
];

export interface PageInput {
  limit?: number;
  after?: string;
  before?: string;
  includeTotal?: boolean;
  dateCreated?: unknown;
  metadata?: unknown;
}

/** The query shared by every list endpoint. */
export function pageQuery(input: PageInput): Record<string, unknown> {
  if (input.after && input.before) {
    throw new Error("Use only one of After and Before — Lob rejects both together");
  }
  return compact({
    limit: input.limit,
    after: input.after,
    before: input.before,
    date_created: asOptionalJson(input.dateCreated, "Date created filter"),
    metadata: asOptionalJson(input.metadata, "Metadata filter"),
  });
}

export const listOutput = [
  { key: "items", type: "array" as const, label: "Records" },
  { key: "count", type: "number" as const, label: "Records in this page" },
  { key: "totalCount", type: "number" as const, label: "Total (only with Include total count)" },
  { key: "nextCursor", type: "string" as const, label: "Cursor for the next page, or null" },
  { key: "previousCursor", type: "string" as const, label: "Cursor for the previous page" },
];

export const mailTypeOptions: Option[] = [
  { value: "usps_first_class", label: "USPS First Class (default)" },
  { value: "usps_standard", label: "USPS Standard (cheaper, slower)" },
];

export const useTypeOptions: Option[] = [
  { value: "marketing", label: "Marketing" },
  { value: "operational", label: "Operational" },
];

export const statusOptions: Option[] = [
  { value: "processed", label: "Processed" },
  { value: "rendered", label: "Rendered" },
  { value: "failed", label: "Failed" },
];

export const sortOptions: Option[] = [
  { value: "date_created:desc", label: "Newest first" },
  { value: "date_created:asc", label: "Oldest first" },
  { value: "send_date:desc", label: "Send date, latest first" },
  { value: "send_date:asc", label: "Send date, earliest first" },
];

/** `sort_by` is a single-key object, `sort_by[date_created]=asc`. */
export function sortBy(value: string | undefined): Record<string, string> | undefined {
  if (!value) return undefined;
  const [field, dir] = value.split(":");
  return { [field]: dir };
}

/** Params common to the mailpiece list endpoints. */
export const mailListParams: Param[] = [
  { key: "status", label: "Status", type: "select", options: statusOptions, advanced: true },
  { key: "mailType", label: "Mail type", type: "select", options: mailTypeOptions, advanced: true },
  {
    key: "scheduled",
    label: "Scheduled only",
    type: "boolean",
    advanced: true,
    hint: "Only mailpieces created with a send date.",
  },
  {
    key: "sendDate",
    label: "Send date filter",
    type: "json",
    advanced: true,
    hint: 'Object with gt/gte/lt/lte ISO-8601 dates, e.g. {"gte":"2026-11-01"}.',
  },
  { key: "sortBy", label: "Sort by", type: "select", options: sortOptions, advanced: true },
  { key: "campaignId", label: "Campaign ID", type: "string", advanced: true },
];

export interface MailListInput extends PageInput {
  status?: string;
  mailType?: string;
  scheduled?: boolean;
  sendDate?: unknown;
  sortBy?: string;
  campaignId?: string;
}

export function mailListQuery(input: MailListInput): Record<string, unknown> {
  return {
    ...pageQuery(input),
    ...compact({
      status: input.status,
      mail_type: input.mailType,
      scheduled: input.scheduled,
      send_date: asOptionalJson(input.sendDate, "Send date filter"),
      sort_by: sortBy(input.sortBy),
      campaign_id: input.campaignId,
    }),
  };
}

/** Params shared by every mailpiece create. */
export const sharedCreateParams: Param[] = [
  {
    key: "to",
    label: "To",
    type: "json",
    required: true,
    hint: 'Either a saved address id (e.g. "adr_123") or an inline address object with ' +
      "address_line1, address_city, address_state, address_zip (US) or address_line1 + " +
      "address_country (international), plus name and/or company.",
  },
  { key: "mailType", label: "Mail type", type: "select", options: mailTypeOptions, advanced: true },
  {
    key: "sendDate",
    label: "Send date",
    type: "datetime",
    advanced: true,
    hint:
      "ISO 8601, up to 180 days ahead. Setting it lets you cancel until it passes (cancellation " +
      "and scheduling are a paid-edition feature).",
  },
  {
    key: "mergeVariables",
    label: "Merge variables",
    type: "json",
    advanced: true,
    hint: 'Object substituted into {{placeholders}} of a template/HTML, e.g. {"name":"Harry"}.',
  },
  {
    key: "metadata",
    label: "Metadata",
    type: "json",
    advanced: true,
    hint: "Up to 20 string key/value pairs for your own tagging.",
  },
  {
    key: "useType",
    label: "Use type",
    type: "select",
    options: useTypeOptions,
    required: true,
    hint:
      "Lob requires you to declare every mailpiece marketing or operational. (Lob allows null " +
      "only when an account default is set in Account Settings; this app always sends a value.)",
  },
  {
    key: "idempotencyKey",
    label: "Idempotency key",
    type: "string",
    advanced: true,
    hint:
      "Sent as Lob's Idempotency-Key header, valid for 24 hours. Set this when a retry must not " +
      "mail twice. If left empty the run's invocation id is used when one exists.",
  },
];

export const mailOutput = [
  { key: "id", type: "string" as const, label: "Mailpiece ID" },
  { key: "url", type: "string" as const, label: "Signed PDF URL" },
  { key: "expected_delivery_date", type: "string" as const, label: "Expected delivery date" },
  { key: "send_date", type: "string" as const, label: "Send date" },
  { key: "date_created", type: "string" as const, label: "Created" },
];

export const cancelOutput = [
  { key: "id", type: "string" as const, label: "ID" },
  { key: "deleted", type: "boolean" as const, label: "Deleted" },
];

/** A multiselect may arrive as an array or a comma-separated string. */
export function toArray(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(",")).map((s) => String(s).trim()).filter(Boolean);
  return items.length ? items : undefined;
}
