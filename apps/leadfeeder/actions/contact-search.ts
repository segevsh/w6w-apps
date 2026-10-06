import type { ActionDefinition } from "@w6w/types";
import { compact, jsonValue, LeadfeederClient, reply, strList } from "../lib/client.ts";
import {
  accountIdParam,
  cursorParam,
  dataOutput,
  metaOutput,
  nextCursorOutput,
  pageSizeParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  searchTerms?: unknown;
  emails?: unknown;
  companyIds?: unknown;
  positions?: unknown;
  departments?: unknown;
  buyerPersonaIds?: unknown;
  filters?: unknown;
  cursor?: string;
  pageSize?: number;
}

/** `POST /v1/contacts/search` — verified against the vendor OpenAPI document (2026-10-06). */
const contactSearch: ActionDefinition<Input> = {
  key: "contact-search",
  type: "search",
  resource: "contact",
  title: "Search Contacts",
  description:
    "Search the contact database by name/title terms, email, company, department or persona. Consumes credits; cursor-paged.",
  params: [
    accountIdParam,
    {
      key: "searchTerms",
      label: "Search terms",
      type: "json",
      hint: "Array or comma-separated text matched against full name and title.",
    },
    {
      key: "emails",
      label: "Emails",
      type: "json",
      hint: "Array or comma-separated email addresses.",
    },
    {
      key: "companyIds",
      label: "Company IDs",
      type: "json",
      hint: "Array or comma-separated company ids.",
    },
    {
      key: "positions",
      label: "Positions",
      type: "json",
      hint: "Array or comma-separated job titles, matched as phrases.",
    },
    {
      key: "departments",
      label: "Departments",
      type: "json",
      hint:
        "Array of department codes such as `sales_department`, `it_department`, `marketing_department`.",
    },
    {
      key: "buyerPersonaIds",
      label: "Buyer persona IDs",
      type: "json",
      hint: "Array or comma-separated persona ids.",
    },
    {
      key: "filters",
      label: "Filters",
      type: "json",
      hint: "Vendor filter object, combined with AND.",
    },
    cursorParam,
    pageSizeParam,
  ],
  output: [
    dataOutput,
    metaOutput,
    nextCursorOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/contacts/search";
    const query = {
      account_id: input.accountId,
      "page[cursor]": input.cursor,
      "page[size]": input.pageSize,
    };
    const body = compact({
      search_terms: strList(input.searchTerms),
      emails: strList(input.emails),
      company_ids: strList(input.companyIds),
      positions: strList(input.positions),
      departments: strList(input.departments),
      buyer_persona_ids: strList(input.buyerPersonaIds),
      filters: jsonValue(input.filters),
    });
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default contactSearch;
