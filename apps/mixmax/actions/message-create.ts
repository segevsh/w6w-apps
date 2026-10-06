import type { ActionDefinition } from "@w6w/types";
import { compact, MixmaxClient, recipients } from "../lib/client.ts";

interface Input {
  to: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
  trackingEnabled?: boolean;
  linkTrackingEnabled?: boolean;
  fileTrackingEnabled?: boolean;
  notificationsEnabled?: boolean;
  inReplyTo?: string;
}

const messageCreate: ActionDefinition<Input> = {
  key: "message-create",
  type: "perform",
  resource: "message",
  title: "Create Draft Message",
  description: "Create a draft email in Mixmax (nothing is sent). Send it later with Send Message.",
  idempotent: false,
  params: [
    {
      key: "to",
      label: "To",
      type: "string",
      required: true,
      hint: "Comma-separated recipient email addresses.",
    },
    { key: "cc", label: "Cc", type: "string", hint: "Comma-separated email addresses." },
    { key: "bcc", label: "Bcc", type: "string", hint: "Comma-separated email addresses." },
    { key: "subject", label: "Subject", type: "string", hint: "Email subject." },
    { key: "body", label: "Body", type: "text", hint: "Email body (HTML)." },
    {
      key: "trackingEnabled",
      label: "Track opens",
      type: "boolean",
      hint: "Track when the email is opened.",
    },
    {
      key: "linkTrackingEnabled",
      label: "Track links",
      type: "boolean",
      hint: "Track link clicks.",
    },
    {
      key: "fileTrackingEnabled",
      label: "Track files",
      type: "boolean",
      hint: "Track attachment downloads.",
    },
    {
      key: "notificationsEnabled",
      label: "Notifications",
      type: "boolean",
      hint: "Notify on engagement.",
    },
    {
      key: "inReplyTo",
      label: "In reply to",
      type: "string",
      hint: "Message id this draft replies to.",
    },
  ],
  output: [{ key: "message", type: "object", label: "Draft message" }, {
    key: "messageId",
    type: "string",
    label: "Message ID",
  }],

  async execute(input, ctx) {
    const message = await new MixmaxClient(ctx).request<{ _id?: string }>("POST", "/messages", {
      body: compact({
        to: recipients(input.to),
        cc: recipients(input.cc),
        bcc: recipients(input.bcc),
        subject: input.subject,
        body: input.body,
        trackingEnabled: input.trackingEnabled,
        linkTrackingEnabled: input.linkTrackingEnabled,
        fileTrackingEnabled: input.fileTrackingEnabled,
        notificationsEnabled: input.notificationsEnabled,
        inReplyTo: input.inReplyTo,
      }),
    });
    return { message, messageId: message._id };
  },
};

export default messageCreate;
