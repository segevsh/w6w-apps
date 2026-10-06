import type { ActionDefinition } from "@w6w/types";
import { compact, LeadfeederClient, reply, strList } from "../lib/client.ts";
import {
  accountIdParam,
  dataOutput,
  metaOutput,
  nextPageOutput,
  pageNumParam,
  pageSizeParam,
} from "../lib/params.ts";

interface Input {
  accountId: string;
  startDate: string;
  endDate: string;
  companyId?: string;
  countryCodes?: unknown;
  cities?: unknown;
  includeCompany?: boolean;
  page?: number;
  pageSize?: number;
}

/** `POST /v1/web-visits` — verified against the vendor OpenAPI document (2026-10-06). */
const webVisitSearch: ActionDefinition<Input> = {
  key: "web-visit-search",
  type: "search",
  resource: "web_visit",
  title: "Search Web Visits",
  description:
    "List individual website visits in a date range, optionally for one company or location.",
  params: [
    accountIdParam,
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      required: true,
      hint: "ISO 8601 date, inclusive (`2026-10-01`).",
    },
    {
      key: "endDate",
      label: "End date",
      type: "string",
      required: true,
      hint: "ISO 8601 date, inclusive.",
    },
    { key: "companyId", label: "Company ID", type: "string" },
    {
      key: "countryCodes",
      label: "Country codes",
      type: "json",
      hint: "Array or comma-separated ISO country codes of the visit location.",
    },
    { key: "cities", label: "Cities", type: "json", hint: "Array or comma-separated city names." },
    { key: "includeCompany", label: "Include company", type: "boolean" },
    pageNumParam,
    pageSizeParam,
  ],
  output: [
    dataOutput,
    metaOutput,
    nextPageOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/web-visits";
    const query = {
      account_id: input.accountId,
      "page[num]": input.page,
      "page[size]": input.pageSize,
      include: input.includeCompany ? "company" : undefined,
    };
    const filters = compact({
      company_id: input.companyId,
      location_country_codes: strList(input.countryCodes),
      location_cities: strList(input.cities),
    });
    const body = compact({
      start_date: input.startDate,
      end_date: input.endDate,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });
    return reply(await new LeadfeederClient(ctx).request("POST", path, { query, body }));
  },
};

export default webVisitSearch;
