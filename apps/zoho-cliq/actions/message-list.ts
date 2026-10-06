import type { ActionDefinition } from "@w6w/types";
import { compact, seg, ZohoCliqClient } from "../lib/client.ts";
import { chatId, limitParam } from "../lib/params.ts";

interface Input {
  chatId: string;
  fromTime?: number;
  toTime?: number;
  limit?: number;
}

interface Output {
  messages: Array<Record<string, unknown>>;
}

/**
 * `GET /api/v2/chats/{CHAT_ID}/messages` — scope `ZohoCliq.Messages.READ`;
 * `{ data: [{ sender, id, time, type, content }] }`. Up to 100 messages when
 * `limit` is omitted.
 */
const messageList: ActionDefinition<Input, Output> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Messages",
  description: "List messages in a chat or channel (use the channel's chat id).",
  params: [
    chatId,
    { key: "fromTime", label: "From time", type: "number", hint: "Epoch milliseconds." },
    { key: "toTime", label: "To time", type: "number", hint: "Epoch milliseconds." },
    limitParam(100),
  ],
  output: [{ key: "messages", type: "array", label: "Messages" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { data?: Array<Record<string, unknown>> }
    >(`/chats/${seg(input.chatId)}/messages`, {
      query: compact({ fromtime: input.fromTime, totime: input.toTime, limit: input.limit }),
    });
    return { messages: body?.data ?? [] };
  },
};

export default messageList;
