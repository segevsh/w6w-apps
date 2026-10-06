import type { ActionDefinition } from "@w6w/types";
import { seg, TwoChatClient } from "../lib/client.ts";

interface Input {
  channelUuid: string;
  phoneNumber?: string;
  pageNumber?: number;
}

const conversationsList: ActionDefinition<Input> = {
  key: "conversations-list",
  type: "read",
  resource: "conversation",
  title: "List Conversations",
  description: "List a connected number's conversations, 10 per page (GET " +
    "/whatsapp/conversations/{channel-uuid}). Poll this to pick up new conversations without a " +
    "webhook.",
  params: [
    {
      key: "channelUuid",
      label: "Channel UUID",
      type: "string",
      required: true,
    },
    {
      key: "phoneNumber",
      label: "Phone number filter",
      type: "string",
      hint: "3 to 20 digits; matches conversations whose number contains them.",
    },
    {
      key: "pageNumber",
      label: "Page number",
      type: "number",
      hint: "Zero-based page index. 2Chat's first page is 0.",
    },
  ],
  output: [
    {
      key: "sessions",
      type: "array",
      label: "Conversations: session_key, phone_number, last_activity_at, contact …",
    },
    { key: "total", type: "number", label: "Total matching" },
  ],

  execute(input, ctx) {
    const client = new TwoChatClient(ctx);
    return client.get(`/whatsapp/conversations/${seg(input.channelUuid)}`, {
      phone_number: input.phoneNumber,
      page_number: input.pageNumber ?? 0,
    });
  },
};

export default conversationsList;
