import type { ActionDefinition } from "@w6w/types";
import { PodiumClient, range } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
  senderUid?: string;
  createdAfter?: string;
  createdBefore?: string;
}

const reviewInviteList: ActionDefinition<Input> = {
  key: "review-invite-list",
  type: "read",
  resource: "review-invite",
  title: "List Review Invites",
  description: "List review invites, newest first. Requires scope `read_reviews`.",
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
    key: "senderUid",
    label: "Sender UID",
    type: "string",
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
    return new PodiumClient(ctx).list("/reviews/invites", {
      query: {
        limit: input.limit,
        cursor: input.cursor,
        senderUid: input.senderUid,
        createdAt: range(input.createdAfter, input.createdBefore),
      },
    });
  },
};

export default reviewInviteList;
