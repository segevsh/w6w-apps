import type { ActionDefinition } from "@w6w/types";
import { listOf, numberOf, RingoverClient, seg } from "../lib/client.ts";
import { limitParam } from "../lib/params.ts";

interface Input {
  conversationId: number;
  limitCount?: number;
  lastIdReturned?: number;
  displayArchived?: boolean;
}

const messageList: ActionDefinition<Input> = {
  key: "message-list",
  type: "read",
  resource: "conversation",
  title: "List Conversation Messages",
  description:
    "List the messages of one conversation (first 100 by default); page with the Last ID cursor.",
  params: [
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    limitParam(1000),
    {
      key: "lastIdReturned",
      label: "Last ID returned",
      type: "number",
      hint: "Cursor: pass the `lastId` of the previous page.",
    },
    { key: "displayArchived", label: "Include archived", type: "boolean" },
  ],
  output: [
    { key: "messages", type: "array", label: "Messages" },
    { key: "count", type: "number", label: "Messages in this page" },
    { key: "total", type: "number", label: "Total messages" },
    { key: "lastId", type: "number", label: "Last ID returned by Ringover (cursor)" },
  ],

  async execute(input, ctx) {
    const body = await new RingoverClient(ctx).request(
      "GET",
      `/conversations/${seg(input.conversationId)}/messages`,
      {
        query: {
          limit_count: input.limitCount,
          last_id_returned: input.lastIdReturned,
          display_archived: input.displayArchived,
        },
      },
    );
    const lastId = (body as { last_id_returned_setted?: number }).last_id_returned_setted;
    return {
      messages: listOf(body, "message_list"),
      count: numberOf(body, "message_list_count"),
      total: numberOf(body, "total_messages_count"),
      lastId,
    };
  },
};

export default messageList;
