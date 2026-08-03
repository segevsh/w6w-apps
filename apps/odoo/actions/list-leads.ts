import type { ActionDefinition } from "@w6w/types";
import {
  CONTEXT_PARAM,
  DOMAIN_PARAM,
  FIELDS_PARAM,
  LIMIT_PARAM,
  OdooClient,
  OFFSET_PARAM,
  ORDER_PARAM,
  type ReadInput,
  RECORDS_OUTPUT,
  searchKwargs,
} from "../lib/client.ts";

/**
 * `crm.lead.search_read` — the CRM pipeline.
 *
 * Like `res.partner`, `crm.lead` is one model covering two things Odoo's UI
 * presents separately: leads and opportunities. The `type` field ("lead" vs
 * "opportunity") is what distinguishes them, so filtering by domain is how you
 * pick — e.g. `[["type","=","opportunity"]]`.
 *
 * `crm.lead` exists only if the CRM app is installed on that database. Odoo's
 * model set is per-database, so an instance without CRM answers this call with
 * an Odoo error naming the missing model. Use List Models to check.
 *
 * Verified live (2026-08-03): `search_read` on `crm.lead` returned
 * `[{"id":27,"display_name":"Interest in your products"},…]`.
 */
const listLeads: ActionDefinition<ReadInput> = {
  key: "list-leads",
  type: "search",
  resource: "crm.lead",
  title: "List Leads",
  description:
    "Search CRM leads and opportunities (`crm.lead`). Both live in one model — filter with " +
    '`[["type","=","opportunity"]]` or `[["type","=","lead"]]` to pick one. Requires the CRM ' +
    "app to be installed.",
  params: [DOMAIN_PARAM, FIELDS_PARAM, LIMIT_PARAM, OFFSET_PARAM, ORDER_PARAM, CONTEXT_PARAM],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "crm.lead",
      "search_read",
      [],
      searchKwargs(input),
    );
    return { records, count: records.length };
  },
};

export default listLeads;
