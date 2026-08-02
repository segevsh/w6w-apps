import type { ActionDefinition } from "@w6w/types";
import { CALENDAR_API_VERSION, HighLevelClient } from "../lib/client.ts";

interface Input {
  contactId: string;
  type: "SMS" | "Email" | "WhatsApp" | "FB" | "IG" | "Live_Chat";
  message?: string;
  subject?: string;
  html?: string;
  emailFrom?: string;
  emailCc?: string;
  emailBcc?: string;
}

const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "conversation",
  title: "Send Message",
  description:
    "Send an outbound message (SMS, email, WhatsApp, Facebook/Instagram DM or live chat) to a " +
    "contact. Creates a new conversation if the contact has none yet.",
  idempotent: false,
  params: [
    { key: "contactId", label: "Contact ID", type: "string", required: true },
    {
      key: "type",
      label: "Channel",
      type: "select",
      required: true,
      options: [
        { value: "SMS", label: "SMS" },
        { value: "Email", label: "Email" },
        { value: "WhatsApp", label: "WhatsApp" },
        { value: "FB", label: "Facebook" },
        { value: "IG", label: "Instagram" },
        { value: "Live_Chat", label: "Live chat" },
      ],
    },
    { key: "message", label: "Message (plain text)", type: "text" },
    { key: "subject", label: "Subject", type: "string", hint: "Email only." },
    { key: "html", label: "HTML body", type: "text", hint: "Email only." },
    { key: "emailFrom", label: "From address", type: "string", hint: "Email only." },
    { key: "emailCc", label: "CC", type: "string", hint: "Email only. Comma-separated addresses." },
    {
      key: "emailBcc",
      label: "BCC",
      type: "string",
      hint: "Email only. Comma-separated addresses.",
    },
  ],
  output: [
    { key: "conversationId", type: "string", label: "Conversation ID" },
    { key: "messageId", type: "string", label: "Message ID" },
  ],

  execute(input, ctx) {
    const client = new HighLevelClient(ctx);
    return client.request("/conversations/messages", {
      method: "POST",
      version: CALENDAR_API_VERSION,
      body: {
        contactId: input.contactId,
        type: input.type,
        message: input.message,
        subject: input.subject,
        html: input.html,
        emailFrom: input.emailFrom,
        emailCc: input.emailCc ? input.emailCc.split(",").map((s) => s.trim()) : undefined,
        emailBcc: input.emailBcc ? input.emailBcc.split(",").map((s) => s.trim()) : undefined,
      },
    });
  },
};

export default sendMessage;
