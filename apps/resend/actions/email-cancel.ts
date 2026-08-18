import type { ActionDefinition } from "@w6w/types";
import { ResendClient } from "../lib/client.ts";

/**
 * `POST /emails/{email_id}/cancel` — verified against Resend's OpenAPI
 * document. Only a **scheduled** email can be cancelled; one already sent
 * cannot be recalled, and Resend answers with an error rather than pretending.
 */
const action: ActionDefinition = {
  key: "email-cancel",
  type: "perform",
  resource: "email",
  title: "Cancel a scheduled email",
  description: "Stop an email that has been scheduled but not yet sent.",
  idempotent: true,
  params: [
    { key: "emailId", label: "Email ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Email ID" },
    { key: "last_event", type: "string", label: "Latest delivery event" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const emailId = String(p.emailId ?? "").trim();
    if (!emailId) throw new Error("`emailId` is required");

    ctx.log("info", "cancelling Resend email", { emailId });

    return await new ResendClient(ctx).request(`/emails/${encodeURIComponent(emailId)}/cancel`, {
      method: "POST",
    });
  },
};

export default action;
