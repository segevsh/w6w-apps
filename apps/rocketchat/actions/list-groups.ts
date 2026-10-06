import type { ActionDefinition } from "@w6w/types";
import { COUNT_PARAM, OFFSET_PARAM, RocketChatClient, SORT_PARAM } from "../lib/client.ts";

interface Input {
  count?: number;
  offset?: number;
  sort?: string;
}

const listGroups: ActionDefinition<Input> = {
  key: "list-groups",
  type: "read",
  resource: "group",
  title: "List Private Groups",
  description: "List the private groups the connected user belongs to (`GET /groups.list`).",
  params: [{ ...COUNT_PARAM }, { ...OFFSET_PARAM }, { ...SORT_PARAM }],
  output: [
    { key: "groups", type: "array", label: "Private groups" },
    { key: "count", type: "number", label: "Items returned" },
    { key: "total", type: "number", label: "Total groups" },
  ],

  execute(input, ctx) {
    return new RocketChatClient(ctx).request("/groups.list", {
      query: { count: input.count, offset: input.offset, sort: input.sort },
    });
  },
};

export default listGroups;
