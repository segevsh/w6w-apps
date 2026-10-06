import type { ActionDefinition } from "@w6w/types";
import { PodiumClient, range } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

const reviewList: ActionDefinition<Input> = {
  key: "review-list",
  type: "read",
  resource: "review",
  title: "List Reviews",
  description: "List reviews, newest first. Requires scope `read_reviews`.",
  params: [{
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Items per page, 1-100 (Podium's default is 10).",
    validation: {
      integer: true,
      min: 1,
      max: 100,
    },
  }, {
    key: "cursor",
    label: "Cursor",
    type: "string",
    hint:
      "`nextCursor` from the previous page. A cursor carries its own filters, so when it is set every other filter below is ignored by Podium.",
  }, {
    key: "createdAfter",
    label: "Created on or after",
    type: "string",
    hint: "ISO 8601.",
  }, {
    key: "createdBefore",
    label: "Created on or before",
    type: "string",
    hint: "ISO 8601.",
  }, {
    key: "updatedAfter",
    label: "Updated on or after",
    type: "string",
    hint: "ISO 8601.",
  }, {
    key: "updatedBefore",
    label: "Updated on or before",
    type: "string",
    hint: "ISO 8601.",
  }],
  output: [{
    key: "items",
    type: "array",
    label: "Items",
  }, {
    key: "nextCursor",
    type: "string",
    label: "Cursor for the next page (null on the last page)",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).list("/reviews", {
      query: {
        limit: input.limit,
        cursor: input.cursor,
        createdAt: range(input.createdAfter, input.createdBefore),
        updatedAt: range(input.updatedAfter, input.updatedBefore),
      },
    });
  },
};

export default reviewList;
