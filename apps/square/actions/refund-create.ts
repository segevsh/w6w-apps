import type { ActionDefinition } from "@w6w/types";
import { idempotencyKey, money, SquareClient, unset } from "../lib/client.ts";
import { amountMoney, currency, idempotencyKeyParam } from "../lib/params.ts";

/** Square caps `RefundPayment.idempotency_key` at 45 characters. */
const MAX_IDEMPOTENCY_KEY = 45;

interface Input {
  paymentId: string;
  amount: number;
  currency: string;
  reason?: string;
  paymentVersionToken?: string;
  teamMemberId?: string;
  idempotencyKey?: string;
}

/**
 * `POST /v2/refunds` (RefundPayment) — refund a Square payment.
 *
 * Scoped deliberately to LINKED refunds: `payment_id` is required and
 * `unlinked` is never sent. Square's unlinked refunds (returning money for a
 * payment Square never processed) require `destination_id` + `location_id`,
 * are gated on the seller's account, and are a materially different operation —
 * modelling both behind one form would make it easy to refund the wrong thing.
 *
 * `idempotency_key` is REQUIRED here (max 45 chars) and defaults to the host's
 * invocation id, so a retried invocation replays the original refund instead of
 * returning the money twice.
 *
 * `payment_version_token` is Square's optimistic-concurrency guard: pass the
 * token you read from the payment and Square rejects the refund if the payment
 * changed since. Optional, and not defaulted.
 */
const refundCreate: ActionDefinition<Input> = {
  key: "refund-create",
  type: "perform",
  resource: "refund",
  title: "Refund Payment",
  description: "Refund all or part of a Square payment. Deduplicated on Square's idempotency key.",
  idempotent: true,
  params: [
    {
      key: "paymentId",
      label: "Payment ID",
      type: "string",
      required: true,
      hint: "The payment being refunded.",
    },
    {
      ...amountMoney,
      hint:
        "In the currency's smallest denomination: 1000 = $10.00 for USD. Cannot exceed the payment's total minus what has already been refunded.",
    },
    currency,
    { key: "reason", label: "Reason", type: "string", hint: "Shown to the seller, not the buyer." },
    {
      key: "paymentVersionToken",
      label: "Payment version token",
      type: "string",
      hint:
        "Optional concurrency guard — the `version_token` you read from the payment. Square rejects the refund if the payment has changed since.",
    },
    { key: "teamMemberId", label: "Team member ID", type: "string" },
    idempotencyKeyParam(MAX_IDEMPOTENCY_KEY),
  ],
  output: [
    { key: "refund", type: "object", label: "Refund" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request("/refunds", {
      body: {
        idempotency_key: idempotencyKey(ctx, input.idempotencyKey, MAX_IDEMPOTENCY_KEY),
        payment_id: input.paymentId,
        amount_money: money(input.amount, input.currency),
        reason: unset(input.reason),
        payment_version_token: unset(input.paymentVersionToken),
        team_member_id: unset(input.teamMemberId),
      },
    });
  },
};

export default refundCreate;
