import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `PATCH /emails/{email_id}` — verified against Resend's OpenAPI document. Its
 * request and response carry exactly one field, `scheduled_at`: the endpoint
 * exists to **reschedule** a queued email and cannot edit its content.
 * `email-cancel` is the way to stop one entirely.
 */
const action: ActionDefinition = {
  key: "email-update",
  type: "perform",
  resource: "email",
  title: "Reschedule an email",
  description: "Change the send time of an email that has not gone out yet.",
  // Applying the same time twice lands in the same state.
  idempotent: true,
  params: [
    { key: "emailId", label: "Email ID", type: "string", required: true, default: "" },
    {
      key: "scheduledAt",
      label: "Send At",
      type: "string",
      required: true,
      default: "",
      placeholder: "in 1 hour",
      hint: "An ISO 8601 timestamp, or Resend's natural-language form like `in 1 hour`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Email ID" },
    { key: "scheduled_at", type: "string", label: "New send time" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const emailId = String(p.emailId ?? "").trim();
    const scheduledAt = String(p.scheduledAt ?? "").trim();
    if (!emailId) throw new Error("`emailId` is required");
    if (!scheduledAt) throw new Error("`scheduledAt` is required");

    ctx.log("info", "rescheduling Resend email", { emailId, scheduledAt });

    return await new ResendClient(ctx).request(`/emails/${encodeURIComponent(emailId)}`, {
      method: "PATCH",
      body: { scheduled_at: scheduledAt },
    });
  },
};

export default action;
