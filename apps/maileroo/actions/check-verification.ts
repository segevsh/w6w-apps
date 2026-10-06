import type { ActionDefinition } from "@w6w/types";
import { MailerooClient, need, seg } from "../lib/client.ts";

interface Input {
  verificationId: string;
  code: string;
}

/**
 * `POST /v1/verify/verifications/:id/check` (scope `verify.verifications.write`). Every
 * well-formed check consumes an attempt, so this is not idempotent. A wrong code is NOT an HTTP
 * error: it is `200` with `status: "incorrect"`. Only a malformed code (not exactly `code_length`
 * digits) is a `400`, and that does not consume an attempt.
 */
const checkVerification: ActionDefinition<Input> = {
  key: "check-verification",
  type: "perform",
  idempotent: false,
  resource: "verification",
  title: "Check Verification Code",
  description: "Check the code a user entered. `status` is approved, incorrect, expired, failed " +
    "or cancelled; a wrong code is a normal result, not an error. Each check uses an attempt. " +
    "Account API Key (verify.verifications.write).",
  params: [
    {
      key: "verificationId",
      label: "Verification ID",
      type: "string",
      required: true,
      hint: "`vrf_…` from Send Verification Code.",
    },
    {
      key: "code",
      label: "Code",
      type: "string",
      required: true,
      validation: { pattern: "^[0-9]{4,8}$" },
      hint: "Digits only, as many as the verification's code length.",
    },
  ],
  output: [
    { key: "status", type: "string", label: "approved, incorrect, expired, failed or cancelled" },
    { key: "approved", type: "boolean", label: "The code was accepted" },
    { key: "attemptsRemaining", type: "number", label: "Checks left (only on incorrect)" },
    { key: "verification", type: "object", label: "The verification record" },
  ],

  async execute(input, ctx) {
    const code = need(input.code, "code");
    if (!/^[0-9]+$/.test(code)) throw new Error("code must contain digits only");
    const { data } = await new MailerooClient(ctx).account(
      `/verify/verifications/${seg(input.verificationId, "verificationId")}/check`,
      { body: { code } },
    );
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      status: d.status,
      approved: d.status === "approved",
      attemptsRemaining: d.attempts_remaining,
      verification: d.verification,
    };
  },
};

export default checkVerification;
