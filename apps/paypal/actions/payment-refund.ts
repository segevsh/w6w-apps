import type { ActionDefinition } from "@w6w/types";
import { compact, PayPalClient } from "../lib/client.ts";

/**
 * Refund a captured payment. Wraps `POST /v2/payments/captures/{id}/refund`.
 * Omitting the amount refunds the capture in full.
 *
 * `PayPal-Request-Id`, keyed off the invocation, is the same idempotency
 * mechanism `order-capture` uses — a retried refund step must not refund
 * twice.
 */
const action: ActionDefinition = {
  key: "payment-refund",
  type: "perform",
  resource: "payment",
  title: "Refund a payment",
  description: "Refund a captured payment, in full or in part.",
  idempotent: true,
  params: [
    { key: "captureId", label: "Capture ID", type: "string", required: true, default: "" },
    {
      key: "amount",
      label: "Amount",
      type: "section",
      section: "group",
      layout: "row",
      children: [
        {
          key: "value",
          label: "Value",
          type: "string",
          default: "",
          hint: "Leave blank to refund the full captured amount.",
        },
        { key: "currencyCode", label: "Currency", type: "string", default: "" },
      ],
    },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        { key: "noteToPayer", label: "Note to Payer", type: "string", default: "" },
        { key: "invoiceId", label: "Invoice ID", type: "string", default: "" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Refund ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "amount", type: "object", label: "Refunded amount ({ currency_code, value })" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const captureId = String(p.captureId ?? "").trim();
    if (!captureId) throw new Error("`captureId` is required");

    const value = String(p.value ?? "").trim();
    const currencyCode = String(p.currencyCode ?? "").trim();
    if (value && !currencyCode) throw new Error("`currencyCode` is required when `value` is set");

    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;
    const body = compact({
      amount: value ? { value, currency_code: currencyCode } : undefined,
      note_to_payer: additional.noteToPayer ? String(additional.noteToPayer) : undefined,
      invoice_id: additional.invoiceId ? String(additional.invoiceId) : undefined,
    });

    ctx.log("info", "refunding PayPal capture", { captureId, full: !value });

    return await new PayPalClient(ctx).request(`/v2/payments/captures/${captureId}/refund`, {
      method: "POST",
      body,
      headers: ctx.invocation?.invocationId
        ? { "paypal-request-id": ctx.invocation.invocationId }
        : {},
    });
  },
};

export default action;
