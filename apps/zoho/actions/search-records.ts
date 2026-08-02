import type { ActionDefinition } from "@w6w/types";
import { crmSearch, type CrmSearchInput } from "../lib/crm.ts";

/**
 * `GET /{module}/search` works the same way for every module — Leads,
 * Contacts, Deals, Accounts, Tasks, Notes, or a custom module — so this one
 * action covers all of them instead of a `*-search` file per resource.
 */
const searchRecords: ActionDefinition<CrmSearchInput> = {
  key: "search-records",
  type: "search",
  resource: "query",
  title: "Search Records",
  description:
    "Search any module's records by criteria, email, phone or a free-text word. Exactly one of those four is required.",
  params: [
    {
      key: "module",
      label: "Module",
      type: "string",
      required: true,
      placeholder: "Leads",
      hint: "API name of the module: `Leads`, `Contacts`, `Deals`, `Accounts`, or a custom one.",
    },
    {
      key: "criteria",
      label: "Criteria",
      type: "string",
      placeholder: "(Last_Name:equals:Smith)",
      hint: "Zoho's criteria syntax: `(Field:operator:value)`, combined with `and`/`or`.",
    },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "word", label: "Word", type: "string", hint: "Global free-text search." },
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "per_page", label: "Per page", type: "number", default: 200, hint: "Max 200." },
  ],
  output: [
    { key: "data", type: "array", label: "Matching records" },
    { key: "info", type: "object", label: "Pagination info" },
  ],

  execute(input, ctx) {
    return crmSearch(ctx, input);
  },
};

export default searchRecords;
