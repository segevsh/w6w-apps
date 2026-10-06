import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  company_uuid: string;
  page?: number;
  items?: number;
}

/** `GET /reseller/companies/{company_uuid}/teams` */
const clientTeamList: ActionDefinition<Input> = {
  key: "client-team-list",
  type: "search",
  resource: "client-team",
  title: "List Client Teams",
  description: "Reseller only: list the teams of a client company.",
  params: [
    {
      key: "company_uuid",
      label: "Client company UUID",
      type: "string",
      required: true,
      hint: "UUID of one of your client companies.",
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
    const res = await new LeexiClient(ctx).request(
      "GET",
      `/reseller/companies/${seg(input.company_uuid)}/teams`,
      {
        query: { page: input.page, items: input.items },
      },
    );
    return { data: res.data ?? [], pagination: res.pagination ?? null };
  },
};

export default clientTeamList;
