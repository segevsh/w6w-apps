import type { ActionDefinition } from "@w6w/types";
import {
  flattenMany,
  type JsonApiDocument,
  NationBuilderClient,
  parseJsonObject,
} from "../lib/client.ts";
import { FILTER_PARAM, pagination, SORT_PARAM } from "../lib/params.ts";

interface Input {
  filter?: unknown;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
}

/** `GET /api/v2/signups` — see `person-get.ts` for why "signup" is exposed as "person". */
const personList: ActionDefinition<Input> = {
  key: "person-list",
  type: "search",
  resource: "person",
  title: "List People",
  description: 'List people (NationBuilder "signups"), optionally filtered and sorted.',
  params: [FILTER_PARAM, SORT_PARAM, ...pagination],
  output: [
    { key: "items", type: "array", label: "People" },
    { key: "meta", type: "object", label: "Response metadata" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>("/signups", {
      query: {
        "page[size]": input.pageSize,
        "page[number]": input.pageNumber,
        sort: input.sort,
      },
      filter: parseJsonObject(input.filter),
    });
    return { items: flattenMany(Array.isArray(res.data) ? res.data : []), meta: res.meta };
  },
};

export default personList;
