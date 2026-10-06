import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, pick, V2 } from "../lib/client.ts";
import { bool, str, text } from "../lib/params.ts";

type Input = {
  message_id: string;
  html: string;
  mailbox_id?: string | number;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  quote_original_message?: boolean;
};

const inboxMessageReply: ActionDefinition<Input> = {
  key: "inbox-message-reply",
  type: "perform",
  resource: "inbox_message",
  title: "Reply to Inbox Message",
  description:
    "Send an email reply to a prospect's response from the Woodpecker inbox. Sends a real email.",
  idempotent: false,
  params: [
    str("message_id", "Message ID", {
      required: true,
      hint: "The inbox message ID from List Inbox Messages.",
    }),
    text("html", "Reply body (HTML)", { required: true }),
    str("mailbox_id", "Mailbox ID", {
      hint: "SMTP ID to send from. Defaults to the mailbox that received the message.",
    }),
    str("to", "To", { hint: "Defaults to the original author." }),
    str("cc", "CC", { hint: "Comma-separated." }),
    str("bcc", "BCC", { hint: "Comma-separated; defaults to the mailbox BCC." }),
    str("subject", "Subject", { hint: "Defaults to the original subject prefixed with Re:." }),
    bool("quote_original_message", "Quote original message"),
  ],
  output: [
    { key: "sent", type: "boolean", label: "True when handed to SMTP" },
    { key: "message_id", type: "string", label: "The message replied to" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {
      ...pick(input, ["to", "cc", "bcc", "subject"]),
      body: { html: input.html },
    };
    if (input.mailbox_id !== undefined && input.mailbox_id !== "") {
      body.mailbox_id = Number(input.mailbox_id);
    }
    if (input.quote_original_message !== undefined) {
      body.quote_original_message = input.quote_original_message;
    }
    await call(ctx, "POST", V2, `/inbox/messages/${encodeId(input.message_id)}/reply`, { body });
    return { sent: true, message_id: input.message_id };
  },
};

export default inboxMessageReply;
