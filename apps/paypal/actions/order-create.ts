import type { ActionDefinition } from "@w6w/types";
import { compact, PayPalClient } from "../lib/client.ts";

/**
 * Create an order — the entry point of PayPal Checkout.
 * Wraps `POST /v2/checkout/orders`.
 *
 * A single purchase unit with a flat amount covers the common "charge this
 * much" case; PayPal's full `purchase_units[].amount.breakdown` (item-level
 * tax/shipping) is out of scope here — pass a pre-computed total instead.
 */
const action: ActionDefinition = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create an order",
  description: "Create a PayPal order to capture or authorize payment against.",
  idempotent: false,
  params: [
    {
      key: "intent",
      label: "Intent",
      type: "select",
      required: true,
      default: "CAPTURE",
      options: [
        { value: "CAPTURE", label: "Capture immediately" },
        { value: "AUTHORIZE", label: "Authorize now, capture later" },
      ],
    },
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
          required: true,
          default: "",
          hint: "e.g. 19.99",
        },
        {
          key: "currencyCode",
          label: "Currency",
          type: "string",
          default: "USD",
          hint: "ISO 4217 currency code, e.g. USD, EUR.",
        },
      ],
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      default: "",
      hint: "Shown to the payer during checkout. Max 127 characters.",
    },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        {
          key: "customId",
          label: "Custom ID",
          type: "string",
          default: "",
          hint: "Your own reference ID, echoed back on the order.",
        },
        {
          key: "invoiceId",
          label: "Invoice ID",
          type: "string",
          default: "",
          hint: "Must be unique across your PayPal account if set.",
        },
        { key: "returnUrl", label: "Return URL", type: "string", default: "" },
        { key: "cancelUrl", label: "Cancel URL", type: "string", default: "" },
        { key: "brandName", label: "Brand Name", type: "string", default: "" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "links", type: "array", label: "HATEOAS links (approve, capture, …)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const value = String(p.value ?? "").trim();
    if (!value) throw new Error("`value` is required");
    const currencyCode = String(p.currencyCode ?? "USD").trim() || "USD";
    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;

    const purchaseUnit = compact({
      description: p.description ? String(p.description) : undefined,
      custom_id: additional.customId ? String(additional.customId) : undefined,
      invoice_id: additional.invoiceId ? String(additional.invoiceId) : undefined,
      amount: { currency_code: currencyCode, value },
    });

    const applicationContext = compact({
      return_url: additional.returnUrl ? String(additional.returnUrl) : undefined,
      cancel_url: additional.cancelUrl ? String(additional.cancelUrl) : undefined,
      brand_name: additional.brandName ? String(additional.brandName) : undefined,
    });

    const body: Record<string, unknown> = {
      intent: p.intent ?? "CAPTURE",
      purchase_units: [purchaseUnit],
      ...(Object.keys(applicationContext).length
        ? { application_context: applicationContext }
        : {}),
    };

    ctx.log("info", "creating PayPal order", { intent: body.intent, currencyCode, value });

    return await new PayPalClient(ctx).request("/v2/checkout/orders", { method: "POST", body });
  },
};

export default action;
