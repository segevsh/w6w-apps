import type { ActionDefinition } from "@w6w/types";
import { SevenClient } from "../lib/client.ts";

/** `GET /api/groups` — `{pagingMetadata, data}`. */
interface Input {
  limit?: number;
  offset?: number;
}

const groupList: ActionDefinition<Input> = {
  key: "group-list",
  type: "search",
  resource: "group",
  title: "List Groups",
  description: "List contact groups with paging.",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      hint: "Groups per page.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "offset",
      label: "Offset",
      type: "number",
      hint: "Where the list starts.",
      validation: { integer: true, min: 0 },
    },
  ],
  output: [
    { key: "data", type: "array", label: "Groups" },
    { key: "pagingMetadata", type: "object", label: "offset, count, total, limit, has_more" },
  ],

  execute(input, ctx) {
    return new SevenClient(ctx).request("GET", "/groups", {
      query: { limit: input.limit, offset: input.offset },
    });
  },
};

export default groupList;
