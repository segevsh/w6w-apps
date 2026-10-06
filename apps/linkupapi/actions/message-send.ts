import type { ActionDefinition } from "@w6w/types";
import { LinkupApiClient } from "../lib/client.ts";
import type { ActionResult } from "../lib/client.ts";
import { type Field, mapInput } from "../lib/params.ts";

interface Input {
  accountId: string;
  messageText: string;
  profileUrl?: string;
  inmail?: boolean;
  subject?: string;
  recipientUrn?: string;
  phoneNumber?: string;
  to?: string;
  html?: string;
  replyTo?: string;
  threadRef?: string;
  cc?: string;
  bcc?: string;
  mediaLink?: string;
  mediaLinks?: string;
  voiceMessage?: boolean;
  quotedMessageId?: string;
}

const FIELDS: readonly Field[] = [
  ["messageText", "message_text", "s"],
  ["profileUrl", "profile_url", "s"],
  ["inmail", "inmail", "b"],
  ["subject", "subject", "s"],
  ["recipientUrn", "recipient_urn", "s"],
  ["phoneNumber", "phone_number", "s"],
  ["to", "to", "s"],
  ["html", "html", "s"],
  ["replyTo", "reply_to", "s"],
  ["threadRef", "thread_ref", "s"],
  ["cc", "cc", "m"],
  ["bcc", "bcc", "m"],
  ["mediaLink", "media_link", "s"],
  ["mediaLinks", "media_links", "m"],
  ["voiceMessage", "voice_message", "b"],
  ["quotedMessageId", "quoted_message_id", "s"],
];

const messageSend: ActionDefinition<Input, ActionResult> = {
  key: "message-send",
  type: "perform",
  resource: "messages",
  title: "Send Message or Email",
  description:
    "Send a LinkedIn message or InMail, a WhatsApp message, or an email from a connected account. Pass the recipient field that matches the account's platform.",
  idempotent: false,
  params: [
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      required: true,
      hint:
        "The LinkupAPI account_id of the connected LinkedIn (or WhatsApp / email) account. List Accounts returns it.",
    },
    { key: "messageText", label: "Message", type: "text", required: true },
    {
      key: "profileUrl",
      label: "Recipient profile URL",
      type: "string",
      hint: "LinkedIn message or InMail.",
    },
    {
      key: "inmail",
      label: "Send as InMail",
      type: "boolean",
      hint: "Needs a premium seat and spends one InMail credit.",
    },
    { key: "subject", label: "Subject", type: "string", hint: "InMail and email." },
    {
      key: "recipientUrn",
      label: "Recipient Sales Navigator URN",
      type: "string",
      hint: "LinkedIn InMail, from Search People (Sales Navigator).",
    },
    {
      key: "phoneNumber",
      label: "Phone number",
      type: "string",
      hint: "WhatsApp: international format, e.g. +33612345678.",
    },
    { key: "to", label: "To email", type: "string", hint: "Email accounts." },
    { key: "html", label: "HTML body", type: "text", hint: "Email." },
    { key: "replyTo", label: "Reply-To", type: "string", hint: "Email." },
    {
      key: "threadRef",
      label: "Thread reference",
      type: "string",
      hint: "Email: the Message-ID to reply into.",
    },
    {
      key: "cc",
      label: "CC",
      type: "string",
      hint: "Email. Several values separated by a semicolon (;).",
    },
    {
      key: "bcc",
      label: "BCC",
      type: "string",
      hint: "Email. Several values separated by a semicolon (;).",
    },
    {
      key: "mediaLink",
      label: "Attachment URL",
      type: "string",
      hint: "A public URL of a file to attach.",
    },
    {
      key: "mediaLinks",
      label: "Attachment URLs",
      type: "string",
      hint: "Several values separated by a semicolon (;).",
    },
    { key: "voiceMessage", label: "Send as voice note", type: "boolean" },
    {
      key: "quotedMessageId",
      label: "Quoted message ID",
      type: "string",
      hint: "WhatsApp: reply to this message id.",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Response data" },
    { key: "creditsConsumed", type: "number", label: "Credits consumed" },
  ],

  async execute(input, ctx) {
    return await new LinkupApiClient(ctx).act(
      "messages",
      "send",
      input.accountId,
      mapInput(input, FIELDS),
    );
  },
};

export default messageSend;
