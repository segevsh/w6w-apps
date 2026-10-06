import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, seg } from "../lib/client.ts";
import { mapVerification, VERIFICATION_OUTPUT } from "./get-verification.ts";

interface Input {
  verificationId: string;
}

/** `POST /v1/verify/verifications/:id/cancel` — `409` once the verification is terminal. */
const cancelVerification: ActionDefinition<Input> = {
  key: "cancel-verification",
  type: "perform",
  idempotent: false,
  resource: "verification",
  title: "Cancel Verification",
  description: "Cancel a verification that is still pending or sent. A verification already " +
    "verified, expired, failed or cancelled answers 409. Account API Key (verify.verifications.write).",
  params: [{ key: "verificationId", label: "Verification ID", type: "string", required: true }],
  output: [...VERIFICATION_OUTPUT],

  async execute(input, ctx) {
    const { data } = await new MailerooClient(ctx).account(
      `/verify/verifications/${seg(input.verificationId, "verificationId")}/cancel`,
      { method: "POST" },
    );
    return mapVerification((data ?? {}) as Record<string, unknown>);
  },
};

export default cancelVerification;
