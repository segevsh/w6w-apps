import type { ActionDefinition } from "@w6w/types";
import { PodiumClient, range, toList } from "../lib/client.ts";

interface Input {
  locationUids?: string[] | string;
  userUid?: string;
  createdAfter?: string;
  createdBefore?: string;
}

const reviewSummaryList: ActionDefinition<Input> = {
  key: "review-summary-list",
  type: "read",
  resource: "review",
  title: "Get Review Summary",
  description:
    "Per-location review summary (counts and average rating). Requires scope `read_reviews`.",
  params: [{
    key: "locationUids",
    label: "Location UIDs",
    type: "string",
    hint: "Comma-separated; default is every accessible location.",
  }, {
    key: "userUid",
    label: "User UID",
    type: "string",
    hint: "Only reviews attributed to this user.",
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
    return new PodiumClient(ctx).list("/reviews/summary", {
      query: {
        locationUids: toList(input.locationUids),
        userUid: input.userUid,
        createdAt: range(input.createdAfter, input.createdBefore),
      },
    });
  },
};

export default reviewSummaryList;
