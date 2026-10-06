import type { ActionDefinition } from "@w6w/types";
import { LeexiClient } from "../lib/client.ts";

interface Input {
  reseller_external_id?: string;
  page?: number;
  items?: number;
}

/** `GET /reseller/companies` */
const clientCompanyList: ActionDefinition<Input> = {
  key: "client-company-list",
  type: "search",
  resource: "client-company",
  title: "List Client Companies",
  description: "Reseller only: list the client companies attached to your reseller account.",
  params: [
    {
      key: "reseller_external_id",
      label: "Your external ID",
      type: "string",
      hint: "Only the company carrying this external id.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "First page is 1.",
      validation: { min: 1, integer: true },
    },
    {
      key: "items",
      label: "Items per page",
      type: "number",
      hint: "1-100, defaults to 10.",
      validation: { min: 1, max: 100, integer: true },
    },
  ],
  output: [
    { key: "data", type: "array", label: "The records on this page" },
    {
      key: "pagination",
      type: "object",
      label: "{ page, items, count, pages } — stop when page reaches pages",
    },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("GET", "/reseller/companies", {
      query: {
        reseller_external_id: input.reseller_external_id,
        page: input.page,
        items: input.items,
      },
    });
    return { data: res.data ?? [], pagination: res.pagination ?? null };
  },
};

export default clientCompanyList;
