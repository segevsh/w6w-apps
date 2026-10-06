import type { ActionDefinition } from "@w6w/types";
import { MailerSendClient, seg } from "../lib/client.ts";

interface Input {
  identityId: string;
}

const resendSenderIdentityVerification: ActionDefinition<Input> = {
  key: "resend-sender-identity-verification",
  type: "perform",
  resource: "sender-identity",
  title: "Resend Sender Identity Verification",
  description:
    "Send the verification email for a sender identity again (POST /v1/identities/{id}/resend).",
  idempotent: true,
  params: [{ key: "identityId", label: "Identity ID", type: "string", required: true }],
  output: [{ key: "resent", type: "boolean", label: "True when the call succeeded" }],

  async execute(input, ctx) {
    await new MailerSendClient(ctx).request(`/identities/${seg(input.identityId)}/resend`, {
      method: "POST",
    });
    return { resent: true };
  },
};

export default resendSenderIdentityVerification;
