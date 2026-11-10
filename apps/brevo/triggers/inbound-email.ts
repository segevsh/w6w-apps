import { brevoWebhook } from "../lib/triggers.ts";

export default brevoWebhook({
  key: "inbound-email",
  title: "Inbound Email",
  description:
    "Fires for each email received on your Brevo inbound parsing domain. The run gets the parsed message (sender, recipients, subject, bodies, attachments).",
  type: "inbound",
  events: ["inboundEmailProcessed"],
  domainParam: true,
  output: [
    { key: "MessageId", type: "string", label: "Message ID" },
    { key: "From", type: "object", label: "From (Name, Address)" },
    { key: "To", type: "array", label: "To" },
    { key: "Subject", type: "string", label: "Subject" },
    { key: "SentAtDate", type: "string", label: "Sent at" },
    { key: "RawTextBody", type: "string", label: "Text body" },
    { key: "Attachments", type: "array", label: "Attachments" },
  ],
  sample: {
    MessageId: "<CAN0zNmMsj@mail.example>",
    From: { Name: "Ada Lovelace", Address: "ada@example.com" },
    To: [{ Name: "Support", Address: "support@inbound.example.com" }],
    Subject: "Re: Summer brochure",
    SentAtDate: "Tue, 1 Sep 2026 09:53:21 +0200",
    RawTextBody: "Thanks, got it.",
    Attachments: [],
  },
});
