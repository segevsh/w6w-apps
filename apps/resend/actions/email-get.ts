import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `GET /emails/{email_id}` — verified against Resend's OpenAPI document.
 *
 * `last_event` is the field to read: it carries the email's delivery state
 * (`sent`, `delivered`, `bounced`, `complained`, …), which is what a workflow
 * polls for after a send.
 */
const action: ActionDefinition = {
  key: "email-get",
  type: "read",
  resource: "email",
  title: "Get an email",
  description: "Retrieve one sent email, including its latest delivery event.",
  params: [
    { key: "emailId", label: "Email ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Email ID" },
    { key: "from", type: "string", label: "From" },
    { key: "to", type: "array", label: "To" },
    { key: "cc", type: "array", label: "Cc" },
    { key: "bcc", type: "array", label: "Bcc" },
    { key: "reply_to", type: "array", label: "Reply-to" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "html", type: "string", label: "HTML body" },
    { key: "text", type: "string", label: "Text body" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "last_event", type: "string", label: "Latest delivery event" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const emailId = String(p.emailId ?? "").trim();
    if (!emailId) throw new Error("`emailId` is required");

    ctx.log("info", "getting Resend email", { emailId });
    return await new ResendClient(ctx).request(`/emails/${encodeURIComponent(emailId)}`);
  },
};

export default action;
