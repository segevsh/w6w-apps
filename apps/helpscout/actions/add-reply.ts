import type { ActionDefinition } from "@w6w/types";
import { csv, HelpScoutClient } from "../lib/client.ts";
import { threadStatusOptions } from "../lib/params.ts";

interface Input {
  conversationId: number;
  customerId: number;
  text: string;
  draft?: boolean;
  status?: string;
  userId?: number;
  assignTo?: number;
  cc?: string;
  bcc?: string;
}

const addReply: ActionDefinition<Input> = {
  key: "add-reply",
  type: "perform",
  resource: "conversation",
  title: "Reply to Conversation",
  description: "Add a reply thread to a conversation, published to the customer.",
  idempotent: false,
  params: [
    { key: "conversationId", label: "Conversation ID", type: "number", required: true },
    { key: "customerId", label: "Customer ID", type: "number", required: true },
    {
      key: "text",
      label: "Reply",
      type: "text",
      required: true,
      config: { multiline: true },
    },
    {
      key: "draft",
      label: "Save as draft",
      type: "boolean",
      default: false,
      hint:
        "A draft reply is not sent, and the conversation owner is not updated, until it is published.",
    },
    {
      key: "status",
      label: "Set conversation status",
      type: "select",
      advanced: true,
      options: threadStatusOptions,
      hint: "If unset, a published reply reactivates the conversation.",
    },
    {
      key: "userId",
      label: "Posting as (user ID)",
      type: "number",
      advanced: true,
      hint: "Defaults to the connection's own user.",
    },
    {
      key: "assignTo",
      label: "Assign to (user ID)",
      type: "number",
      advanced: true,
      hint: "Updates the conversation owner once this reply is published.",
    },
    { key: "cc", label: "CC", type: "string", advanced: true, hint: "Comma-separated emails." },
    { key: "bcc", label: "BCC", type: "string", advanced: true, hint: "Comma-separated emails." },
  ],
  output: [{ key: "id", type: "number", label: "Thread ID" }],

  async execute(input, ctx) {
    const { resourceId } = await new HelpScoutClient(ctx).create(
      `/conversations/${input.conversationId}/reply`,
      {
        customer: { id: input.customerId },
        text: input.text,
        draft: input.draft ?? false,
        status: input.status,
        user: input.userId,
        assignTo: input.assignTo,
        cc: csv(input.cc),
        bcc: csv(input.bcc),
      },
    );
    return { id: resourceId };
  },
};

export default addReply;
