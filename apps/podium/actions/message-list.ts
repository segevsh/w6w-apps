import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  conversation_uid: string;
  cursor?: string;
  order?: string;
  since?: string;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List the messages in a conversation. Requires scope `read_messages`.",
  params: [{
    key: "conversation_uid",
    label: "Conversation UID",
    type: "string",
    required: true,
  }, {
    key: "cursor",
    label: "Cursor",
    type: "string",
    hint:
      "`nextCursor` from the previous page. A cursor carries its own filters, so when it is set every other filter below is ignored by Podium.",
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
      "ISO 8601 timestamp; only items whose publish time (`createdAt`) is at or after this time (inclusive).",
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
    return new PodiumClient(ctx).list(
      `/conversations/${encodeId(input.conversation_uid)}/messages`,
      {
        query: {
          cursor: input.cursor,
          order: input.order,
          since: input.since,
        },
      },
    );
  },
};

export default messageList;
