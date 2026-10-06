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
  page?: number;
  pageSize?: number;
}

/** `GET /v1/tags` — verified against the vendor OpenAPI document (2026-10-06). */
const tagList: ActionDefinition<Input> = {
  key: "tag-list",
  type: "search",
  resource: "tag",
  title: "List Tags",
  description: "List the tags that can be assigned to companies.",
  params: [
    accountIdParam,
    pageNumParam,
    pageSizeParam,
  ],
  output: [
    dataOutput,
    metaOutput,
    nextPageOutput,
  ],

  async execute(input, ctx) {
    const path = "/v1/tags";
    const query = {
      account_id: input.accountId,
      "page[num]": input.page,
      "page[size]": input.pageSize,
    };
    return reply(await new LeadfeederClient(ctx).request("GET", path, { query }));
  },
};

export default tagList;
