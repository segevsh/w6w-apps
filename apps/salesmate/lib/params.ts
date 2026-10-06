import type { Param } from "@w6w/types";
import { parseJson } from "./client.ts";

/** Module ids from the reference's "Module Ids" table. */
export const MODULES = {
  contact: { id: 1, name: "Contact", path: "contact", prefix: "contact" },
  activity: { id: 2, name: "Task", path: "activity", prefix: "activity" },
  deal: { id: 4, name: "Deal", path: "deal", prefix: "deal" },
  company: { id: 5, name: "Company", path: "company", prefix: "company" },
} as const;
export type ModuleKey = keyof typeof MODULES;

export const customFieldsParam: Param = {
  key: "customFields",
  label: "Custom fields",
  type: "json",
  advanced: true,
  hint: 'Custom fields by API name, sent as top-level body keys: { "textCustomField1": "x" }',
};

export const tagsParam: Param = {
  key: "tags",
  label: "Tags",
  type: "string",
  advanced: true,
  hint: "Comma-separated, e.g. VIP,Bags",
};

export const ownerParam = (required: boolean): Param => ({
  key: "owner",
  label: "Owner (user ID)",
  type: "number",
  required,
  hint: 'The owning user\'s id — use "List Active Users" to find one.',
});

export const currencyParam: Param = {
  key: "currency",
  label: "Currency",
  type: "string",
  advanced: true,
  hint: "Three-letter ISO code in uppercase, e.g. USD.",
};

export const billingParams: Param[] = [
  { key: "billingAddressLine1", label: "Billing address line 1", type: "string", advanced: true },
  { key: "billingAddressLine2", label: "Billing address line 2", type: "string", advanced: true },
  { key: "billingCity", label: "Billing city", type: "string", advanced: true },
  { key: "billingState", label: "Billing state", type: "string", advanced: true },
  { key: "billingZipCode", label: "Billing zip code", type: "string", advanced: true },
  { key: "billingCountry", label: "Billing country", type: "string", advanced: true },
];

export const socialParams: Param[] = [
  { key: "skypeId", label: "Skype ID", type: "string", advanced: true },
  { key: "linkedInHandle", label: "LinkedIn", type: "string", advanced: true },
  { key: "facebookHandle", label: "Facebook", type: "string", advanced: true },
  { key: "twitterHandle", label: "Twitter", type: "string", advanced: true },
  { key: "googlePlusHandle", label: "Google+", type: "string", advanced: true },
];

export function idParam(key: string, label: string): Param {
  return { key, label, type: "number", required: true, validation: { min: 1, integer: true } };
}

/**
 * Search is a POST with a query object, not a list endpoint. Every module's
 * request has the same shape (documented for Contact, Deal and Activity):
 * `displayingFields`, `filterQuery.group{operator,rules[]}`, `sort`, `moduleId`,
 * `reportType: "get_data"`, `getRecordsCount: true`. Paging is `rows`/`from` in
 * the query string, with a documented ceiling of 250 records per request.
 */
export const searchParams: Param[] = [
  {
    key: "rules",
    label: "Filter rules",
    type: "json",
    hint:
      'Array of rules, e.g. [{"condition":"CONTAINS","moduleName":"Contact","field":{"fieldName":"contact.email","displayName":"Email","type":"Text"},"data":"@acme.com","eventType":"Text"}]. ' +
      "Empty = every record (the reference's own sample filter, created after 1970).",
  },
  {
    key: "fields",
    label: "Fields to return",
    type: "json",
    advanced: true,
    hint: 'Array of field API names, e.g. ["contact.id","contact.name","contact.email"].',
  },
  { key: "sortBy", label: "Sort by", type: "string", row: "sort", advanced: true },
  {
    key: "sortOrder",
    label: "Order",
    type: "select",
    row: "sort",
    advanced: true,
    options: [{ value: "asc", label: "Ascending" }, { value: "desc", label: "Descending" }],
  },
  {
    key: "rows",
    label: "Rows",
    type: "number",
    default: 100,
    row: "page",
    validation: { min: 1, max: 250, integer: true },
    hint: "Records per request; the reference caps this at 250.",
  },
  {
    key: "from",
    label: "From",
    type: "number",
    default: 0,
    row: "page",
    validation: { min: 0, integer: true },
    hint: "Offset of the first record to return.",
  },
];

export interface SearchInput {
  rules?: unknown;
  fields?: unknown;
  sortBy?: string;
  sortOrder?: string;
  rows?: number;
  from?: number;
}

export function buildSearch(module: ModuleKey, defaultFields: string[], input: SearchInput) {
  const m = MODULES[module];
  const rules = parseJson(input.rules, "rules") ?? [{
    condition: "IS_AFTER",
    moduleName: m.name,
    field: { fieldName: `${m.prefix}.createdAt`, displayName: "Created At", type: "DateTime" },
    data: "Jan 01, 1970 05:30 AM",
    eventType: "DateTime",
  }];
  if (!Array.isArray(rules)) throw new Error("`rules` must be a JSON array of rule objects.");
  const fields = parseJson(input.fields, "fields") ?? defaultFields;
  if (!Array.isArray(fields)) throw new Error("`fields` must be a JSON array of field names.");
  return {
    displayingFields: fields,
    filterQuery: { group: { operator: "AND", rules } },
    sort: { fieldName: input.sortBy ?? "", order: input.sortBy ? (input.sortOrder ?? "asc") : "" },
    moduleId: m.id,
    reportType: "get_data",
    getRecordsCount: true,
  };
}

export const searchOutput = [
  { key: "records", type: "array" as const, label: "Records" },
  { key: "totalRows", type: "number" as const, label: "Total matching rows" },
  { key: "totalPages", type: "number" as const, label: "Total pages" },
];

export const NOTE_MODULES = ["contact", "company", "deal", "activity"] as const;
export const noteModuleOptions = [
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
  { value: "deal", label: "Deal" },
  { value: "activity", label: "Activity" },
];

export type NoteModule = typeof NOTE_MODULES[number];
