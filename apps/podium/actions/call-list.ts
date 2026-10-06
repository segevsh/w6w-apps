import type { ActionDefinition } from "@w6w/types";
import { PodiumClient } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
  locationUid?: string;
  order?: string;
  since?: string;
}

const callList: ActionDefinition<Input> = {
  key: "call-list",
  type: "read",
  resource: "call",
  title: "List Calls",
  description:
    "List Podium Phones calls (calls synced from third-party call tracking are not listed). Requires scope `read_phones`.",
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
    key: "locationUid",
    label: "Location UID",
    type: "string",
    hint: "Podium location uid.",
  }, {
    key: "order",
    label: "Order",
    type: "select",
    options: [{
      value: "asc",
      label: "asc",
    }, {
      value: "desc",
      label: "desc",
    }],
  }, {
    key: "since",
    label: "Since",
    type: "string",
    hint:
      "ISO 8601 timestamp; only items whose record changed (`updatedAt`) is at or after this time (inclusive).",
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
    return new PodiumClient(ctx).list("/calls", {
      query: {
        limit: input.limit,
        cursor: input.cursor,
        locationUid: input.locationUid,
        order: input.order,
        since: input.since,
      },
    });
  },
};

export default callList;
