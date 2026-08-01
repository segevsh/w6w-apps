import type { ActionDefinition } from "@w6w/types";
import { PayPalClient } from "../lib/client.ts";

/**
 * Send a batch payout. Wraps `POST /v1/payments/payouts`.
 *
 * `senderBatchId` is PayPal's own idempotency key for this endpoint — a
 * retried call with the same ID is deduplicated by PayPal rather than
 * creating a second payout, which is what makes this safe to mark
 * `idempotent: true` as long as the caller supplies a stable ID.
 *
 * `items` accepts PayPal's own payout-item shape directly (a JSON escape
 * hatch, same pattern as SendGrid's `dynamicTemplateFields`) so a single
 * batch can pay out to more than one recipient without a bespoke
 * fixed-collection UI:
 *
 *   [{ "receiver": "a@b.com", "amount": { "value": "10.00", "currency": "USD" },
 *      "recipient_type": "EMAIL", "note": "...", "sender_item_id": "..." }]
 *
 * `recipient_type` defaults to `EMAIL` when omitted.
 */
const action: ActionDefinition = {
  key: "payout-create",
  type: "perform",
  resource: "payout",
  title: "Create a payout",
  description: "Send a batch payout to one or more recipients.",
  idempotent: true,
  params: [
    {
      key: "senderBatchId",
      label: "Sender Batch ID",
      type: "string",
      required: true,
      default: "",
      hint: "A unique ID you assign. Retrying with the same ID is deduplicated by PayPal.",
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      default: [],
      hint: "PayPal payout-item objects, e.g. " +
        '[{ "receiver": "a@b.com", "amount": { "value": "10.00", "currency": "USD" } }]',
    },
    {
      key: "additionalFields",
      label: "Additional Fields",
      type: "group",
      default: {},
      children: [
        { key: "emailSubject", label: "Email Subject", type: "string", default: "" },
        { key: "emailMessage", label: "Email Message", type: "string", default: "" },
        { key: "note", label: "Note", type: "string", default: "" },
      ],
    },
  ],
  output: [
    {
      key: "batch_header",
      type: "object",
      label: "Batch header ({ payout_batch_id, batch_status, … })",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const senderBatchId = String(p.senderBatchId ?? "").trim();
    if (!senderBatchId) throw new Error("`senderBatchId` is required");

    const rawItems = p.items;
    const itemList = Array.isArray(rawItems)
      ? rawItems
      : typeof rawItems === "string" && rawItems.trim()
      ? JSON.parse(rawItems)
      : [];
    if (!Array.isArray(itemList) || itemList.length === 0) {
      throw new Error("`items` must be a non-empty array of payout items");
    }

    const items = itemList.map((raw, i) => {
      const item = raw as Record<string, unknown>;
      const receiver = String(item.receiver ?? "").trim();
      const amount = item.amount as { value?: unknown; currency?: unknown } | undefined;
      const value = String(amount?.value ?? "").trim();
      const currency = String(amount?.currency ?? "").trim();
      if (!receiver || !value || !currency) {
        throw new Error(
          `items[${i}] must have \`receiver\` and \`amount.value\`/\`amount.currency\``,
        );
      }
      return {
        recipient_type: item.recipient_type ?? "EMAIL",
        receiver,
        amount: { value, currency },
        ...(item.note ? { note: String(item.note) } : {}),
        ...(item.sender_item_id ? { sender_item_id: String(item.sender_item_id) } : {}),
        ...(item.recipient_wallet ? { recipient_wallet: item.recipient_wallet } : {}),
      };
    });

    const additional = (p.additionalFields ?? {}) as Record<string, unknown>;
    const header: Record<string, unknown> = { sender_batch_id: senderBatchId };
    if (additional.emailSubject) header.email_subject = String(additional.emailSubject);
    if (additional.emailMessage) header.email_message = String(additional.emailMessage);
    if (additional.note) header.note = String(additional.note);

    ctx.log("info", "creating PayPal payout", { senderBatchId, items: items.length });

    return await new PayPalClient(ctx).request("/v1/payments/payouts", {
      method: "POST",
      body: { sender_batch_header: header, items },
    });
  },
};

export default action;
