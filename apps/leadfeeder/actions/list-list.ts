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
  scope: string;
  page?: number;
  pageSize?: number;
}

/** `GET /v1/lists` — verified against the vendor OpenAPI document (2026-10-06). */
const listList: ActionDefinition<Input> = {
  key: "list-list",
  type: "search",
  resource: "list",
  title: "List Lists",
  description: "List the company or contact lists of an account.",
  params: [
    accountIdParam,
    {
      key: "scope",
      label: "Scope",
      type: "select",
      required: true,
      hint: "Which kind of list to return.",
      options: [{ value: "company", label: "Company" }, { value: "contact", label: "Contact" }],
      default: "company",
    },
    pageNumParam,
    pageSizeParam,
  ],
  output: [
    dataOutput,
    metaOutput,
    nextPageOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/lists";
    const query = {
      account_id: input.accountId,
      "filter[scope]": input.scope,
      "page[num]": input.page,
      "page[size]": input.pageSize,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default listList;
