import type { ActionDefinition } from "@w6w/types";
import { RecurlyClient } from "../lib/client.ts";

interface Input {
  planCode: string;
  currency: string;
  accountCode: string;
  quantity?: number;
  unitAmount?: number;
  couponCodes?: string;
  totalBillingCycles?: number;
  autoRenew?: boolean;
}

/**
 * `POST /subscriptions` — create a subscription for an account.
 *
 * `account` goes over the wire as `{ code: accountCode }` — Recurly's own
 * documented sample for this endpoint (its Node/Python/Ruby/.NET/Java
 * `x-code-samples` all write it this way). This is Recurly's find-or-create
 * behavior: if an account with that code already exists the subscription
 * attaches to it, otherwise Recurly creates a bare new account with that code
 * first. It is not a lookup by Recurly's internal account ID — only `code`
 * is accepted in this shape (`AccountCreate`'s one required field).
 *
 * `currency` is required even when the plan already has pricing in that
 * currency — Recurly does not infer it from the plan or account.
 *
 * Not idempotent: a retry creates a second subscription for the account, and
 * this action sends no `Idempotency-Key` header. Recurly supports one on
 * every POST/PUT/DELETE, but only its Ruby SDK manages it automatically — a
 * caller wanting retry safety here must add their own via `ctx.invocation`
 * once the runtime exposes header overrides to this action.
 */
const createSubscription: ActionDefinition<Input> = {
  key: "create-subscription",
  type: "perform",
  resource: "subscription",
  title: "Create Subscription",
  description: "Create a subscription for an account, from a plan code.",
  idempotent: false,
  params: [
    { key: "planCode", label: "Plan code", type: "string", required: true },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      required: true,
      hint: "3-letter ISO 4217 code, e.g. `USD`. Required even if the plan already prices in it.",
    },
    {
      key: "accountCode",
      label: "Account code",
      type: "string",
      required: true,
      hint: "Attaches to the account with this code, creating a bare new account with this code " +
        "if none exists yet.",
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      hint: "Defaults to 1.",
      validation: { integer: true, min: 0 },
    },
    {
      key: "unitAmount",
      label: "Custom unit amount",
      type: "number",
      hint: "Overrides the plan's price for this subscription, in the currency's MAJOR unit " +
        "(10.00 = $10.00, not cents).",
      validation: { min: 0, max: 1000000 },
    },
    {
      key: "couponCodes",
      label: "Coupon codes",
      type: "string",
      hint: "Comma-separated list of coupon codes to redeem on the subscription or account.",
    },
    {
      key: "totalBillingCycles",
      label: "Total billing cycles",
      type: "number",
      hint: "Number of cycles in a term. Omit to run indefinitely.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "autoRenew",
      label: "Auto renew",
      type: "boolean",
      hint: "Whether the subscription renews at the end of its term. Defaults to true.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Subscription ID" },
    { key: "uuid", type: "string", label: "Subscription UUID" },
    { key: "state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return RecurlyClient.fromConnection(ctx).request("/subscriptions", {
      json: {
        plan_code: input.planCode,
        currency: input.currency,
        account: { code: input.accountCode },
        quantity: input.quantity,
        unit_amount: input.unitAmount,
        coupon_codes: input.couponCodes
          ? input.couponCodes.split(",").map((c) => c.trim()).filter(Boolean)
          : undefined,
        total_billing_cycles: input.totalBillingCycles,
        auto_renew: input.autoRenew,
      },
    });
  },
};

export default createSubscription;
