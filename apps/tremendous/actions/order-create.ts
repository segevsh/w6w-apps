import type { ActionDefinition } from "@w6w/types";
import { compactBody, TremendousClient } from "../lib/client.ts";

/**
 * `POST /orders` — send a reward. Every reward this app can send goes through
 * this one action: an order wraps the fulfilment of a single reward (a gift
 * card, prepaid card, cash payout or donation) to one recipient.
 *
 * Multi-reward orders (`creating-multi-product-rewards-wip`) are marked
 * work-in-progress in Tremendous's own docs and, per `create-order`'s OpenAPI
 * `requestBody`, the only schema actually documented under its `oneOf` is
 * `SingleRewardOrder` — so this action sends single-reward orders only.
 *
 * ## `external_id` is a REQUIRED-BY-CONVENTION idempotency key
 *
 * Unlike Wise's `customerTransactionId`, Tremendous's `external_id` is
 * optional and format-free (any string) — but the "Idempotence" section of
 * the `create-order` reference is explicit about what skipping it costs: a
 * retried request with no `external_id` (a timeout, a workflow step re-run)
 * creates a SECOND paid order. Supplying one is what makes the action safe to
 * retry: the same `external_id` after the initial order returns the ORIGINAL
 * order's data with a `201` (not `200`) status and creates nothing further;
 * the same `external_id` with DIFFERENT parameters answers `409`.
 *
 * When the caller doesn't supply one, this action derives one from the
 * step's invocation id — the same invocation always derives the same
 * `external_id`, so a host-driven retry of one workflow step reuses it
 * instead of double-paying. A manual re-run with no invocation context (the
 * editor's "test" trigger) falls back to a random id, which is honest: there
 * is no stable identity to key on there.
 *
 * ## `duplicate` in the output
 *
 * `res.status === 201` (as opposed to the normal `200`) is Tremendous's own
 * signal that this call matched an existing order rather than creating one —
 * surfaced here rather than silently discarded, so a workflow can branch on
 * "did this actually send a new reward" instead of assuming every success
 * means a fresh payout.
 */
interface Input {
  fundingSourceId: string;
  externalId?: string;
  campaignId?: string;
  products?: string[];
  denomination: number;
  currencyCode?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  deliveryMethod?: string;
  deliverAt?: string;
  language?: string;
  senderName?: string;
  subjectLine?: string;
  message?: string;
  customFields?: Array<{ id: string; value: string }>;
}

const orderCreate: ActionDefinition<Input> = {
  key: "order-create",
  type: "perform",
  resource: "order",
  title: "Create Order (Send Reward)",
  description: "Send a gift card, prepaid card, cash payout or donation to one recipient.",
  // Safe to retry when `externalId` is set (auto-derived below when the caller omits it) —
  // Tremendous's own idempotency check makes a repeated call a no-op rather than a second charge.
  idempotent: true,
  params: [
    {
      key: "fundingSourceId",
      label: "Funding source ID",
      type: "string",
      required: true,
      hint: "From List Funding Sources, or one of the magic values BALANCE, INVOICE, or " +
        "INVOICE_THEN_BALANCE (case-insensitive). INVOICE* requires a commercial invoicing " +
        "setup.",
    },
    {
      key: "externalId",
      label: "Idempotency key (external ID)",
      type: "string",
      hint: "Leave empty to derive one automatically from this step's invocation, so a retry of " +
        "the same step reuses the existing order instead of sending a duplicate reward.",
    },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      hint: "From List Campaigns. Either this or Products is required.",
    },
    {
      key: "products",
      label: "Products",
      type: "array",
      item: { type: "string", placeholder: "Product ID" },
      hint: "Product IDs from List Products (e.g. an Amazon.com gift card). Overrides the " +
        "campaign's products unless left empty; either this or Campaign ID is required.",
    },
    {
      key: "denomination",
      label: "Amount",
      type: "number",
      required: true,
      hint: "The reward's face value, in Currency code (or your organization's currency).",
    },
    {
      key: "currencyCode",
      label: "Currency code",
      type: "string",
      hint: "3-letter ISO 4217 code, e.g. USD, EUR, GBP. Defaults to your organization's currency.",
    },
    { key: "recipientName", label: "Recipient name", type: "string" },
    {
      key: "recipientEmail",
      label: "Recipient email",
      type: "string",
      hint: "Required for delivery method Email.",
    },
    {
      key: "recipientPhone",
      label: "Recipient phone",
      type: "string",
      hint: "Required for delivery method Phone (SMS). Non-US numbers need a + country code.",
    },
    {
      key: "deliveryMethod",
      label: "Delivery method",
      type: "select",
      default: "EMAIL",
      options: [
        { value: "EMAIL", label: "Email" },
        { value: "LINK", label: "Link (deliver yourself; see order-get for the link)" },
        { value: "PHONE", label: "SMS" },
      ],
    },
    {
      key: "deliverAt",
      label: "Deliver at",
      type: "date",
      advanced: true,
      hint: "Within the next year. If omitted, delivers as soon as possible.",
    },
    {
      key: "language",
      label: "Redemption language",
      type: "string",
      advanced: true,
      hint: "2-letter ISO-639-1 code (e.g. de, fr). Defaults to en.",
    },
    {
      key: "senderName",
      label: "Sender name",
      type: "string",
      advanced: true,
      hint: 'Shown as the sender. Email rewards append "via Tremendous"; the sender address ' +
        "cannot be customized.",
    },
    { key: "subjectLine", label: "Subject line", type: "string", advanced: true },
    { key: "message", label: "Message", type: "text", advanced: true },
    {
      key: "customFields",
      label: "Custom fields",
      type: "array",
      advanced: true,
      item: {
        type: "object",
        fields: [
          { key: "id", label: "Field ID", type: "string", required: true },
          { key: "value", label: "Value", type: "string", required: true },
        ],
      },
      hint: "Custom field IDs from the Tremendous dashboard (Settings > Custom Fields).",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Order ID" },
    { key: "status", type: "string", label: "Order status" },
    { key: "duplicate", type: "boolean", label: "Matched an existing external_id (no new order)" },
  ],

  async execute(input, ctx) {
    if (!input.campaignId && (!input.products || input.products.length === 0)) {
      throw new Error("Either campaignId or products is required");
    }

    const externalId = input.externalId ??
      (ctx.invocation?.invocationId
        ? await deriveExternalId(ctx.invocation.invocationId)
        : `w6w-${crypto.randomUUID()}`);

    ctx.log("info", "creating Tremendous order", {
      fundingSourceId: input.fundingSourceId,
      externalId,
    });

    const { status, body } = await new TremendousClient(ctx).request<{ order: OrderBody }>(
      "/orders",
      {
        method: "POST",
        body: {
          external_id: externalId,
          payment: { funding_source_id: input.fundingSourceId },
          reward: compactBody({
            campaign_id: input.campaignId,
            products: input.products && input.products.length > 0 ? input.products : undefined,
            value: compactBody({
              denomination: input.denomination,
              currency_code: input.currencyCode,
            }),
            recipient: nonEmpty(compactBody({
              name: input.recipientName,
              email: input.recipientEmail,
              phone: input.recipientPhone,
            })),
            deliver_at: input.deliverAt,
            language: input.language,
            delivery: nonEmpty(compactBody({
              method: input.deliveryMethod,
              meta: nonEmpty(compactBody({
                sender_name: input.senderName,
                subject_line: input.subjectLine,
                message: input.message,
              })),
            })),
            custom_fields: input.customFields,
          }),
        },
      },
    );

    return { ...body.order, duplicate: status === 201 };
  },
};

interface OrderBody {
  id: string;
  status: string;
  [key: string]: unknown;
}

/** `undefined` for an empty object, so an all-optional nested field is omitted rather than `{}`. */
function nonEmpty<T extends Record<string, unknown>>(obj: T): T | undefined {
  return Object.keys(obj).length > 0 ? obj : undefined;
}

/**
 * Derive a stable id from an arbitrary seed string, prefixed so it reads as
 * ours in Tremendous's dashboard. Unlike Wise's `customerTransactionId`,
 * `external_id` has no documented format constraint, so no UUID-shaping is
 * needed — the seed's own hash is enough to keep it short and identity-stable.
 */
export async function deriveExternalId(seed: string): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)),
  );
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `w6w-${hex}`;
}

export default orderCreate;
