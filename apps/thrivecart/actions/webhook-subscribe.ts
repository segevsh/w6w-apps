import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { modeParam } from "../lib/params.ts";

/**
 * `POST /subscribe` — register a URL to receive ThriveCart webhook events.
 * One of two endpoints in this app with a JSON body (see
 * `customer-email-update`).
 *
 * Not idempotent, on the vendor's own advice: "we highly recommend using
 * random and unique URLs for each subscription you create" specifically
 * because subscriptions are removed by URL — nothing here dedupes a repeat
 * call against the same `target_url`, so retrying would very plausibly
 * create a second subscription rather than return the first.
 *
 * `targetUrl` must begin with a URL already registered in the app's own
 * settings — a workflow-supplied URL that was never registered there will
 * be rejected by ThriveCart regardless of what this action sends.
 */
interface Input {
  event: string;
  targetUrl: string;
  triggerFields?: unknown;
  mode?: string;
}

const webhookSubscribe: ActionDefinition<Input> = {
  key: "webhook-subscribe",
  type: "perform",
  resource: "webhook",
  title: "Subscribe To Event",
  description: "Register a URL to receive a ThriveCart webhook event.",
  idempotent: false,
  params: [
    {
      key: "event",
      label: "Event",
      type: "select",
      required: true,
      options: [
        { value: "*", label: "* (all events)" },
        { value: "order_payment_product", label: "Product purchased" },
        { value: "order_payment_bump", label: "Bump offer purchased" },
        { value: "order_payment_upsell", label: "Upsell purchased" },
        { value: "order_payment_downsell", label: "Downsell purchased" },
        { value: "order_payment_declined_product", label: "Purchase declined" },
        { value: "cart_abandoned", label: "Cart abandoned" },
        { value: "order_refund", label: "Refund issued" },
        { value: "order_rebill", label: "Recurring payment succeeded" },
        { value: "order_rebill_failed", label: "Recurring payment failed" },
        { value: "order_rebill_cancelled", label: "Subscription cancelled" },
        { value: "order_rebill_completed", label: "Split pay completed" },
        { value: "subscription_paused", label: "Subscription paused" },
        { value: "subscription_resumed", label: "Subscription resumed" },
        { value: "affiliate_created", label: "Affiliate created" },
        { value: "affiliate_approved", label: "Affiliate approved" },
        { value: "affiliate_rejected", label: "Affiliate rejected" },
        { value: "affiliate_commission_earned", label: "Affiliate commission earned" },
        { value: "affiliate_commission_payout", label: "Affiliate commission paid out" },
        { value: "affiliate_commission_refund", label: "Affiliate commission clawed back" },
      ],
    },
    {
      key: "targetUrl",
      label: "Target URL",
      type: "string",
      required: true,
      hint: "Must begin with a URL already registered in your ThriveCart app's URL settings.",
    },
    {
      key: "triggerFields",
      label: "Trigger fields",
      type: "json",
      advanced: true,
      hint: 'Optional filter object, e.g. {"mode_int": 2}. See ThriveCart\'s developer site for ' +
        "the full filtering reference.",
    },
    modeParam,
  ],
  output: [{ key: "subscription_id", type: "number", label: "Subscription ID" }],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/subscribe", {
      json: {
        event: input.event,
        target_url: input.targetUrl,
        trigger_fields: input.triggerFields,
      },
      mode: input.mode,
    });
  },
};

export default webhookSubscribe;
