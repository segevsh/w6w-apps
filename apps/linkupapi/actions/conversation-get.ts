import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  conversationId?: string;
  profileUrl?: string;
  phoneNumber?: string;
  count?: number;
  cursor?: string;
  markAsRead?: boolean;
  salesNav?: boolean;
}

const FIELDS: readonly Field[] = [
  ["conversationId", "conversation_id", "s"],
  ["profileUrl", "profile_url", "s"],
  ["phoneNumber", "phone_number", "s"],
  ["count", "count", "n"],
  ["cursor", "cursor", "s"],
  ["markAsRead", "mark_as_read", "b"],
  ["salesNav", "sales_nav", "b"],
];

const conversationGet: ActionDefinition<Input, ActionResult> = {
  key: "conversation-get",
  type: "read",
  resource: "messages",
  title: "Get Conversation",
  description:
    "Read the messages of one conversation, found by conversation id, profile URL or phone number.",
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      hint: "From List Inbox. Required unless profileUrl or phoneNumber is given.",
    },
    { key: "profileUrl", label: "Participant profile URL", type: "string" },
    { key: "phoneNumber", label: "Phone number", type: "string", hint: "WhatsApp contact." },
    {
      key: "count",
      label: "Count",
      type: "number",
      hint: "Number of messages to return (default 10).",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The cursor from the previous response's next_cursor; omit for the first page.",
    },
    {
      key: "markAsRead",
      label: "Mark as read",
      type: "boolean",
      hint: "True marks the conversation read, false unread; omit to leave it unchanged.",
    },
    {
      key: "salesNav",
      label: "Sales Navigator",
      type: "boolean",
      hint: "Use the Sales Navigator seat of the account (it must hold one).",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "messages",
      "get_conversation",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default conversationGet;
