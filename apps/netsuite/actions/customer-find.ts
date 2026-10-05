import type { ActionDefinition } from "@w6w/types";
import { compact, NetSuiteClient, recordId, recordPath } from "../lib/client.ts";
import { quoteFilter } from "../lib/params.ts";

interface Input {
  email?: string;
  companyName?: string;
  externalId?: string;
  includeInactive?: boolean;
  fields?: string;
  limit?: number;
}

/**
 * Find customers by email, company name or external id. Builds the `q=` filter Oracle documents
 * in "Record Collection Filtering" (`email IS "…"`, `companyname START_WITH "…"`,
 * `externalId IS "…"`, `isinactive IS false`) and, because that collection only returns ids,
 * optionally fetches each match with the chosen `fields`.
 */
const customerFind: ActionDefinition<Input> = {
  key: "customer-find",
  type: "search",
  resource: "customer",
  title: "Find Customers",
  description: "Find customers by email, company name or external id.",
  params: [
    { key: "email", label: "Email (exact)", type: "string" },
    { key: "companyName", label: "Company name (starts with)", type: "string" },
    { key: "externalId", label: "External ID (exact)", type: "string" },
    {
      key: "includeInactive",
      label: "Include inactive customers",
      type: "boolean",
      default: false,
    },
    {
      key: "fields",
      label: "Fields to return",
      type: "string",
      default: "entityId,companyName,email",
      hint: "Comma-separated body fields fetched for each match. Blank returns ids only.",
    },
    {
      key: "limit",
      label: "Max customers",
      type: "number",
      default: 10,
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    { key: "customers", type: "array", label: "Matches (id plus the requested fields)" },
    { key: "count", type: "number", label: "Matches returned" },
    { key: "hasMore", type: "boolean", label: "More matches exist beyond the limit" },
  ],

  async execute(input, ctx) {
    const clauses: string[] = [];
    if (input.email) clauses.push(`email IS ${quoteFilter(input.email)}`);
    if (input.companyName) clauses.push(`companyname START_WITH ${quoteFilter(input.companyName)}`);
    if (input.externalId) clauses.push(`externalId IS ${quoteFilter(input.externalId)}`);
    if (clauses.length === 0) {
      throw new Error("Give at least one of email, company name or external id.");
    }
    if (!input.includeInactive) clauses.push("isinactive IS false");
    const limit = input.limit ?? 10;

    const client = new NetSuiteClient(ctx);
    const res = await client.request(recordPath("customer"), {
      query: { q: clauses.join(" AND "), limit },
    });
    const d = res.data ?? {};
    const ids = (Array.isArray(d.items) ? d.items : [])
      .map((i) => String((i as { id?: unknown }).id ?? ""))
      .filter((id) => id !== "");

    const fields = input.fields?.trim();
    const customers: unknown[] = [];
    for (const id of ids) {
      if (!fields) {
        customers.push({ id });
        continue;
      }
      const rec = await client.request(recordPath("customer", recordId(id)), { query: { fields } });
      customers.push(compact({ id, ...(rec.data ?? {}), links: undefined }));
    }
    return { customers, count: customers.length, hasMore: d.hasMore === true };
  },
};

export default customerFind;
