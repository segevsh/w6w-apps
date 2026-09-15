import type { ActionDefinition } from "@w6w/types";
import {
  flattenMany,
  type JsonApiDocument,
  NationBuilderClient,
  parseJsonObject,
} from "../lib/client.ts";
import { FILTER_PARAM, pagination } from "../lib/params.ts";

interface Input {
  filter?: unknown;
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/v2/donations` — confirmed against the vendor's OpenAPI spec. */
const donationList: ActionDefinition<Input> = {
  key: "donation-list",
  type: "search",
  resource: "donation",
  title: "List Donations",
  description: "List donations in this nation, optionally filtered.",
  params: [FILTER_PARAM, ...pagination],
  output: [{ key: "items", type: "array", label: "Donations" }],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/donations", {
      query: { "page[size]": input.pageSize, "page[number]": input.pageNumber },
      filter: parseJsonObject(input.filter),
    });
    return { items: flattenMany(Array.isArray(res.data) ? res.data : []) };
  },
};

export default donationList;
