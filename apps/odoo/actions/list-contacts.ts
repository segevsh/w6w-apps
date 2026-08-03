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
 * `res.partner.search_read` — the contact/company directory.
 *
 * `res.partner` is Odoo's single address-book model and it is deliberately one
 * model, not two: customers, vendors, companies and the individual people who
 * work at them are all partners, distinguished by fields rather than by type.
 * `is_company` separates an organisation from a person, and `parent_id` links a
 * person to their employer. That is why this action filters by domain instead of
 * offering a "companies" and a "contacts" variant — the split is a query, not a
 * different endpoint.
 *
 * Verified live (2026-08-03): `search_read` with `args: []` and
 * `{domain, fields, limit}` in `kwargs` returned
 * `[{"id":9,"name":"Acme Corporation"},…]`.
 */
const listContacts: ActionDefinition<ReadInput> = {
  key: "list-contacts",
  type: "search",
  resource: "res.partner",
  title: "List Contacts",
  description: "Search contacts and companies (`res.partner`). Filter with an Odoo domain — e.g. " +
    '`[["is_company","=",true]]` for organisations only, or `[["email","!=",false]]` for ' +
    "records that have an email address.",
  params: [
    DOMAIN_PARAM,
    FIELDS_PARAM,
    LIMIT_PARAM,
    OFFSET_PARAM,
    ORDER_PARAM,
    CONTEXT_PARAM,
  ],
  output: RECORDS_OUTPUT,

  async execute(input, ctx) {
    const records = await OdooClient.fromConnection(ctx).call<Record<string, unknown>[]>(
      "res.partner",
      "search_read",
      [],
      searchKwargs(input),
    );
    return { records, count: records.length };
  },
};

export default listContacts;
