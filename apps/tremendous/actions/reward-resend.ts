import type { ActionDefinition } from "@w6w/types";
import { compactBody, TremendousClient } from "../lib/client.ts";

/**
 * `POST /rewards/{id}/resend` — resend a reward that previously failed to
 * deliver, optionally to a corrected email or phone number.
 *
 * Per the reference, only a reward with a PREVIOUS DELIVERY FAILURE can be
 * resent, and at most one of `updated_email`/`updated_phone` may be given
 * (not both).
 */
interface Input {
  id: string;
  updatedEmail?: string;
  updatedPhone?: string;
}

const rewardResend: ActionDefinition<Input> = {
  key: "reward-resend",
  type: "perform",
  resource: "reward",
  title: "Resend Reward",
  description: "Resend a reward that previously failed to deliver.",
  idempotent: false,
  params: [
    { key: "id", label: "Reward ID", type: "string", required: true },
    {
      key: "updatedEmail",
      label: "Updated email",
      type: "string",
      hint: "Only for rewards delivered by email. Provide at most one of email/phone.",
    },
    {
      key: "updatedPhone",
      label: "Updated phone",
      type: "string",
      hint: "Only for rewards delivered by SMS. Provide at most one of email/phone.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Resend queued" }],

  async execute(input, ctx) {
    if (input.updatedEmail && input.updatedPhone) {
      throw new Error("Provide at most one of updatedEmail / updatedPhone, not both");
    }
    ctx.log("info", "resending Tremendous reward", { id: input.id });
    const body = compactBody({
      updated_email: input.updatedEmail,
      updated_phone: input.updatedPhone,
    });
    // The vendor's documented success body is `{}` — nothing to return but confirmation.
    await new TremendousClient(ctx).json(`/rewards/${encodeURIComponent(input.id)}/resend`, {
      method: "POST",
      body: Object.keys(body).length > 0 ? body : undefined,
    });
    return { ok: true };
  },
};

export default rewardResend;
