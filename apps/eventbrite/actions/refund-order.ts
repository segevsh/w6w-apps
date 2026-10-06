import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  orderId: string;
  reason?: string;
  notes?: string;
  sendRefundEmail?: boolean;
  refundRequestId?: string;
  refundMethod?: string;
  creditExpirationPeriod?: string;
  refundRetentionPolicyStrategyCode?: string;
  extra?: Record<string, unknown>;
}

const refundOrder: ActionDefinition<Input> = {
  key: "refund-order",
  type: "perform",
  idempotent: false,
  resource: "order",
  title: "Refund Order",
  description:
    "Fully refund an order on Eventbrite. This issues a refund (money moves) and cannot be undone. Limited availability: only for organizations Eventbrite has granted access.",
  params: [
    { key: "orderId", label: "Order ID", type: "string", required: true },
    {
      key: "reason",
      label: "Reason",
      type: "select",
      options: [
        "duplicate_order",
        "event_cancelled",
        "event_not_as_described",
        "dissatisfied_with_event",
        "no_longer_able_to_attend",
        "event_postponed",
        "forgot_to_use_discount_or_promo_code",
        "purchased_the_wrong_ticket",
        "ticket_price_or_taxes_changed",
        "other_reason_not_listed",
        "refund_within_organizer_policy",
      ].map((v) => ({ value: v, label: v })),
    },
    { key: "notes", label: "Notes", type: "text" },
    {
      key: "sendRefundEmail",
      label: "Send refund email",
      type: "boolean",
      hint: "Eventbrite defaults to true.",
    },
    { key: "refundRequestId", label: "Refund request ID", type: "string" },
    {
      key: "refundMethod",
      label: "Refund method",
      type: "select",
      options: [
        { value: "original_payment", label: "Original payment" },
        { value: "attendee_account_credit", label: "Attendee account credit" },
        { value: "donation", label: "Donation" },
      ],
    },
    {
      key: "creditExpirationPeriod",
      label: "Credit expiration period",
      type: "select",
      options: [
        { value: "never", label: "Never" },
        { value: "1_year", label: "1 year" },
        { value: "2_years", label: "2 years" },
        { value: "3_years", label: "3 years" },
      ],
    },
    {
      key: "refundRetentionPolicyStrategyCode",
      label: "Fee retention strategy",
      type: "select",
      hint: "Who covers the Eventbrite fee when the reason retains it. Omit to refund the fee.",
      options: [
        { value: "retain_fee_to_attendee", label: "Attendee covers the fee" },
        { value: "retain_fee_to_event_creator", label: "Event creator covers the fee" },
      ],
    },
    { key: "extra", label: "Additional fields", type: "json" },
  ],
  output: [
    { key: "error", type: "string", label: "Error code (on failure)" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    const body: Record<string, unknown> = {
      reason: input.reason,
      notes: input.notes,
      send_refund_email: input.sendRefundEmail,
      refund_request_id: input.refundRequestId,
      refund_method: input.refundMethod,
      credit_expiration_period: input.creditExpirationPeriod,
      refund_retention_policy_strategy_code: input.refundRetentionPolicyStrategyCode,
    };
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
    Object.assign(body, input.extra ?? {});
    return client.request(`/orders/${encodeURIComponent(input.orderId)}/refunds/`, {
      method: "POST",
      body,
    });
  },
};

export default refundOrder;
