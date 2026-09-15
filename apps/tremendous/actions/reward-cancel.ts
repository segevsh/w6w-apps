import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/**
 * `POST /rewards/{id}/cancel` — cancel a reward and refund its cost.
 *
 * Per the reference: only a non-expired reward with a DELIVERY FAILURE can be
 * canceled. A reward that has already been redeemed cannot be canceled — that
 * call fails with `422` and the reward is left unchanged, which is exactly the
 * property that makes this action safe to retry: a second cancel of an
 * already-canceled (or already-redeemed) reward cannot cancel it twice or
 * refund it twice, it can only fail loudly.
 */
interface Input {
  id: string;
}

const rewardCancel: ActionDefinition<Input> = {
  key: "reward-cancel",
  type: "perform",
  resource: "reward",
  title: "Cancel Reward",
  description:
    "Cancel a reward with a delivery failure and refund its cost. Redeemed rewards cannot be " +
    "canceled.",
  idempotent: true,
  params: [{ key: "id", label: "Reward ID", type: "string", required: true }],
  output: [{ key: "ok", type: "boolean", label: "Canceled" }],

  async execute(input, ctx) {
    ctx.log("info", "canceling Tremendous reward", { id: input.id });
    // The vendor's documented success body is `{}` — nothing to return but confirmation.
    await new TremendousClient(ctx).json(`/rewards/${encodeURIComponent(input.id)}/cancel`, {
      method: "POST",
    });
    return { ok: true };
  },
};

export default rewardCancel;
