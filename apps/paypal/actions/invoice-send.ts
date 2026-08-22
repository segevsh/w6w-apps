import type { ActionDefinition } from "@w6w/types";
import { compact, PayPalClient } from "../lib/client.ts";

/**
 * Send a draft invoice to its recipient. Wraps
 * `POST /v2/invoicing/invoices/{id}/send`. Moves the invoice from `DRAFT` to
 * a payable state and emails the recipient — not marked idempotent, since a
 * retry would send the notification email again.
 */
const action: ActionDefinition = {
  key: "invoice-send",
  type: "perform",
  resource: "invoice",
  title: "Send an invoice",
  description: "Send a draft invoice to its recipient by email.",
  idempotent: false,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true, default: "" },
    { key: "subject", label: "Email Subject", type: "string", default: "" },
    { key: "note", label: "Note to Recipient", type: "text", default: "" },
    {
      key: "additionalOptions",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      collapsed: true,
      children: [
        {
          key: "sendToRecipient",
          label: "Send to Recipient",
          type: "boolean",
          default: true,
        },
        {
          key: "sendToInvoicer",
          label: "Also Send a Copy to Me",
          type: "boolean",
          default: false,
        },
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
    { key: "href", type: "string", label: "Link to the sent invoice" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const invoiceId = String(p.invoiceId ?? "").trim();
    if (!invoiceId) throw new Error("`invoiceId` is required");

    // These used to be a nested `additionalFields` group. A section writes its
    // children FLAT at this level, so read them from the top and fall back to
    // the deprecated group for steps saved against the old shape.
    const legacy = (p.additionalFields ?? {}) as Record<string, unknown>;
    const additional: Record<string, unknown> = { ...legacy };
    for (const k of ["sendToRecipient", "sendToInvoicer"]) {
      const v = p[k];
      if (v !== undefined && v !== null && v !== "") additional[k] = v;
    }
    const body = compact({
      subject: p.subject ? String(p.subject) : undefined,
      note: p.note ? String(p.note) : undefined,
      send_to_recipient: additional.sendToRecipient !== false,
      send_to_invoicer: additional.sendToInvoicer === true,
    });

    ctx.log("info", "sending PayPal invoice", { invoiceId });

    return await new PayPalClient(ctx).request(`/v2/invoicing/invoices/${invoiceId}/send`, {
      method: "POST",
      body,
    });
  },
};

export default action;
