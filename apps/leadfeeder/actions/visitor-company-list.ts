import type { ActionDefinition } from "@w6w/types";
import { LeadfeederClient, reply } from "../lib/client.ts";
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
  customFeedId?: string;
  includeCompany?: boolean;
  page?: number;
  pageSize?: number;
}

/** `GET /v1/web-visits/companies` — verified against the vendor OpenAPI document (2026-10-06). */
const visitorCompanyList: ActionDefinition<Input> = {
  key: "visitor-company-list",
  type: "search",
  resource: "web_visit",
  title: "List Visitor Companies",
  description:
    "List the companies that visited your website in a date range, optionally through a custom feed.",
  params: [
    accountIdParam,
    {
      key: "startDate",
      label: "Start date",
      type: "string",
      required: true,
      hint: "ISO 8601 date.",
    },
    { key: "endDate", label: "End date", type: "string", required: true, hint: "ISO 8601 date." },
    {
      key: "customFeedId",
      label: "Custom feed ID",
      type: "string",
      hint: "Restrict to one custom feed (see List Custom Feeds).",
    },
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
    const path = "/v1/web-visits/companies";
    const query = {
      account_id: input.accountId,
      start_date: input.startDate,
      end_date: input.endDate,
      custom_feed_id: input.customFeedId,
      "page[num]": input.page,
      "page[size]": input.pageSize,
      include: input.includeCompany ? "company" : undefined,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default visitorCompanyList;
