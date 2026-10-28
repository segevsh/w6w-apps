import type { ActionDefinition } from "@w6w/types";
import { seg, ZohoCliqClient } from "../lib/client.ts";
import { chatId } from "../lib/params.ts";

interface Input {
  chatId: string;
}

interface Output {
  members: Array<Record<string, unknown>>;
}

/** `GET /api/v2/chats/{chat_id}/members` — scope `ZohoCliq.Chats.READ`; `{ members: [...] }`. */
const chatMemberList: ActionDefinition<Input, Output> = {
  key: "chat-member-list",
  type: "read",
  resource: "chat",
  title: "List Chat Members",
  description: "List the members of a chat.",
  params: [chatId],
  output: [{ key: "members", type: "array", label: "Members" }],

  async execute(input, ctx) {
    const body = await new ZohoCliqClient(ctx).request<
      { members?: Array<Record<string, unknown>> }
    >(`/chats/${seg(input.chatId)}/members`, {
      query: { fields: "name,email_id,user_id" },
    });
    return { members: body?.members ?? [] };
  },
};

export default chatMemberList;
