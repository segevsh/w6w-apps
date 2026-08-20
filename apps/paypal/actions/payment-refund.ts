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
      key: "additionalOptions",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      collapsed: true,
      children: [
        { key: "noteToPayer", label: "Note to Payer", type: "string", default: "" },
        { key: "invoiceId", label: "Invoice ID", type: "string", default: "" },
      ],
    },
    {
      key: "additionalFields",
      // DEPRECATED. These fields used to sit in a `type: "group"`, which
      // ParamsForm renders as a raw JSON editor — so none of them were
      // reachable as form fields. They are in the section above now; this
      // stays declared because `resolveParams` drops any key an action does
      // not declare, so removing it would silently strip saved values.
      label: "Additional Fields (deprecated)",
      type: "json",
      default: {},
      advanced: true,
      hint: "Superseded by the fields above and kept only so older saved steps keep working. " +
        "Anything set here is used only when the matching field above is empty.",
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

    // These used to be a nested `additionalFields` group. A section writes its
    // children FLAT at this level, so read them from the top and fall back to
    // the deprecated group for steps saved against the old shape.
    const legacy = (p.additionalFields ?? {}) as Record<string, unknown>;
    const additional: Record<string, unknown> = { ...legacy };
    for (const k of ["noteToPayer", "invoiceId"]) {
      const v = p[k];
      if (v !== undefined && v !== null && v !== "") additional[k] = v;
    }
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
