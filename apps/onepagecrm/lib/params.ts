import type { Param } from "@w6w/types";
import { asOptionalJson, compact, toList } from "./client.ts";

/** Writable Contact fields shared by Create and Update (OpenAPI `POST/PUT /contacts` bodies). */
export const CONTACT_FIELD_PARAMS: Param[] = [
  {
    key: "title",
    label: "Title",
    type: "select",
    options: [{ value: "Mr", label: "Mr" }, { value: "Mrs", label: "Mrs" }, {
      value: "Ms",
      label: "Ms",
    }],
  },
  { key: "firstName", label: "First name", type: "string" },
  { key: "lastName", label: "Last name", type: "string" },
  { key: "jobTitle", label: "Job title", type: "string" },
  { key: "starred", label: "Starred", type: "boolean" },
  {
    key: "companyName",
    label: "Company name",
    type: "string",
    hint:
      "Links the contact to an existing company (matched case-insensitively) or creates one. On update it renames or moves the company.",
  },
  {
    key: "emails",
    label: "Emails",
    type: "json",
    hint: 'e.g. `[{"type": "work", "value": "a@b.com"}]`. Types: work, home, other.',
  },
  {
    key: "phones",
    label: "Phones",
    type: "json",
    hint:
      'e.g. `[{"type": "mobile", "value": "+353 1 234 5678"}]`. Types: work, mobile, home, direct, fax, company, other.',
  },
  {
    key: "urls",
    label: "URLs",
    type: "json",
    hint:
      'e.g. `[{"type": "website", "value": "https://example.com"}]`. Types: website, blog, twitter, linkedin, xing, facebook, google_plus, other.',
  },
  {
    key: "addressList",
    label: "Addresses",
    type: "json",
    hint:
      'e.g. `[{"type": "work", "address": "1 Main St", "city": "Cork", "state": "", "zip_code": "", "country_code": "ie"}]`. Types: work, home, billing, delivery, other.',
  },
  { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
  {
    key: "statusId",
    label: "Status ID",
    type: "string",
    hint: "From List Statuses (the status `id`). Defaults to `lead` on create.",
  },
  { key: "leadSourceId", label: "Lead source ID", type: "string", hint: "From List Lead Sources." },
  { key: "background", label: "Background", type: "text" },
  {
    key: "ownerId",
    label: "Owner ID",
    type: "string",
    hint: "A user id from List Users. Defaults to the calling user on create.",
  },
  {
    key: "customFields",
    label: "Custom fields",
    type: "json",
    hint: '`[{"custom_field": {"id": "<custom field id>"}, "value": "…"}]`. Admin users only.',
  },
];

/** Build the contact request body from action input; unset fields are omitted. */
export function contactBody(input: Record<string, unknown>): Record<string, unknown> {
  return compact({
    title: input.title,
    first_name: input.firstName,
    last_name: input.lastName,
    job_title: input.jobTitle,
    starred: input.starred,
    company_id: input.companyId,
    company_name: input.companyName,
    emails: asOptionalJson(input.emails, "emails"),
    phones: asOptionalJson(input.phones, "phones"),
    urls: asOptionalJson(input.urls, "urls"),
    address_list: asOptionalJson(input.addressList, "addressList"),
    tags: toList(input.tags as string[] | string),
    status_id: input.statusId,
    lead_source_id: input.leadSourceId,
    background: input.background,
    owner_id: input.ownerId,
    custom_fields: asOptionalJson(input.customFields, "customFields"),
  });
}

/** Writable Deal fields shared by Create and Update. */
export const DEAL_FIELD_PARAMS: Param[] = [
  { key: "name", label: "Name", type: "string", hint: "Up to 60 characters; longer is truncated." },
  { key: "text", label: "Description", type: "text" },
  {
    key: "amount",
    label: "Amount",
    type: "number",
    hint: "Per month for a multi-month deal; the total is amount x months.",
  },
  { key: "months", label: "Months", type: "number", validation: { integer: true, min: 1 } },
  {
    key: "stage",
    label: "Stage",
    type: "number",
    hint: "Pending deals only. A per-pipeline integer, 0 to 100 exclusive (see List Pipelines).",
    validation: { integer: true },
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "pending", label: "Pending" },
      { value: "won", label: "Won" },
      { value: "lost", label: "Lost" },
    ],
  },
  { key: "expectedCloseDate", label: "Expected close date", type: "string", hint: "YYYY-MM-DD." },
  { key: "closeDate", label: "Close date", type: "string", hint: "YYYY-MM-DD; for won/lost." },
  { key: "ownerId", label: "Owner ID", type: "string" },
  { key: "pipelineId", label: "Pipeline ID", type: "string", hint: "From List Pipelines." },
  {
    key: "dealFields",
    label: "Custom deal fields",
    type: "json",
    hint: '`[{"deal_field": {"id": "<deal field id>"}, "value": "…"}]`',
  },
];

export function dealBody(input: Record<string, unknown>): Record<string, unknown> {
  return compact({
    contact_id: input.contactId,
    owner_id: input.ownerId,
    pipeline_id: input.pipelineId,
    name: input.name,
    text: input.text,
    stage: input.stage,
    status: input.status,
    expected_close_date: input.expectedCloseDate,
    close_date: input.closeDate,
    amount: input.amount,
    months: input.months,
    deal_fields: asOptionalJson(input.dealFields, "dealFields"),
  });
}

/** Date-window params shared by several lists (`since`/`until` pair with `dateFilter`). */
export const WINDOW_PARAMS: Param[] = [
  {
    key: "modifiedSince",
    label: "Modified since",
    type: "string",
    hint:
      "Return only records modified since this time (e.g. 2026-01-01). Not combinable with a date filter.",
  },
];
