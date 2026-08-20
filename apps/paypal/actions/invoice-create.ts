import type { ActionDefinition } from "@w6w/types";
import { compact, PayPalClient } from "../lib/client.ts";

/**
 * Create a draft invoice. Wraps `POST /v2/invoicing/invoices`.
 *
 * Covers the common single-line-item case (`detail` + one `primary_recipients`
 * entry + one `items` entry) — PayPal's full shape supports multiple
 * recipients and line items, which is out of scope here. A draft invoice is
 * not sent to the recipient until `invoice-send` is called.
 */
const action: ActionDefinition = {
  key: "invoice-create",
  type: "perform",
  resource: "invoice",
  title: "Create a draft invoice",
  description: "Create a draft invoice with a single recipient and line item.",
  idempotent: false,
  params: [
    {
      key: "recipientEmail",
      label: "Recipient Email",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "item",
      label: "Line Item",
      type: "section",
      section: "group",
      layout: "row",
      children: [
        { key: "itemName", label: "Name", type: "string", required: true, default: "" },
        { key: "quantity", label: "Quantity", type: "string", default: "1" },
        { key: "unitAmount", label: "Unit Price", type: "string", required: true, default: "" },
        { key: "currencyCode", label: "Currency", type: "string", default: "USD" },
      ],
    },
    {
      key: "note",
      label: "Note",
      type: "text",
      default: "",
      hint: "Shown to the recipient on the invoice.",
    },
    {
      key: "additionalOptions",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      collapsed: true,
      children: [
        { key: "invoiceNumber", label: "Invoice Number", type: "string", default: "" },
        { key: "dueDate", label: "Due Date", type: "date", default: "" },
        { key: "termsAndConditions", label: "Terms and Conditions", type: "text", default: "" },
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
    { key: "id", type: "string", label: "Invoice ID" },
    { key: "status", type: "string", label: "Status (DRAFT until sent)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const recipientEmail = String(p.recipientEmail ?? "").trim();
    if (!recipientEmail) throw new Error("`recipientEmail` is required");
    const itemName = String(p.itemName ?? "").trim();
    if (!itemName) throw new Error("`itemName` is required");
    const unitAmount = String(p.unitAmount ?? "").trim();
    if (!unitAmount) throw new Error("`unitAmount` is required");
    const currencyCode = String(p.currencyCode ?? "USD").trim() || "USD";

    // These used to be a nested `additionalFields` group. A section writes its
    // children FLAT at this level, so read them from the top and fall back to
    // the deprecated group for steps saved against the old shape.
    const legacy = (p.additionalFields ?? {}) as Record<string, unknown>;
    const additional: Record<string, unknown> = { ...legacy };
    for (const k of ["invoiceNumber", "dueDate", "termsAndConditions"]) {
      const v = p[k];
      if (v !== undefined && v !== null && v !== "") additional[k] = v;
    }

    const body = compact({
      detail: compact({
        currency_code: currencyCode,
        note: p.note ? String(p.note) : undefined,
        invoice_number: additional.invoiceNumber ? String(additional.invoiceNumber) : undefined,
        payment_term: additional.dueDate ? { due_date: String(additional.dueDate) } : undefined,
        terms_and_conditions: additional.termsAndConditions
          ? String(additional.termsAndConditions)
          : undefined,
      }),
      primary_recipients: [{ billing_info: { email_address: recipientEmail } }],
      items: [
        compact({
          name: itemName,
          quantity: String(p.quantity ?? "1"),
          unit_amount: { currency_code: currencyCode, value: unitAmount },
        }),
      ],
    });

    ctx.log("info", "creating PayPal draft invoice", { recipientEmail, itemName });

    return await new PayPalClient(ctx).request("/v2/invoicing/invoices", { method: "POST", body });
  },
};

export default action;
