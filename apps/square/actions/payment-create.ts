import type { ActionDefinition } from "@w6w/types";
import { idempotencyKey, money, SquareClient, unset } from "../lib/client.ts";
import { amountMoney, currency, idempotencyKeyParam, locationId } from "../lib/params.ts";

/** Square caps `CreatePayment.idempotency_key` at 45 characters. */
const MAX_IDEMPOTENCY_KEY = 45;

interface Input {
  sourceId: string;
  amount: number;
  currency: string;
  idempotencyKey?: string;
  locationId?: string;
  customerId?: string;
  orderId?: string;
  referenceId?: string;
  note?: string;
  tipAmount?: number;
  autocomplete?: boolean;
  buyerEmailAddress?: string;
  statementDescriptionIdentifier?: string;
}

/**
 * `POST /v2/payments` (CreatePayment) — charge a payment source.
 *
 * `source_id` is a payment token, NOT a card number: it comes from the Web
 * Payments SDK / In-App Payments SDK (`cnon:…`), a stored card on file
 * (`ccof:…` or a card id), or one of the literals `CASH` / `EXTERNAL` for
 * recording a payment taken elsewhere. Nothing in this app touches PAN data.
 *
 * `idempotency_key` is REQUIRED here (max 45 chars) and defaults to the host's
 * invocation id, so a retried invocation replays the original payment rather
 * than charging twice — which is why `idempotent: true` is honest. See
 * `idempotencyKey()` in lib/client.ts for why there is no random fallback.
 */
const paymentCreate: ActionDefinition<Input> = {
  key: "payment-create",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description:
    "Charge a payment token, a card on file, or record a cash/external payment. Deduplicated on Square's idempotency key.",
  idempotent: true,
  params: [
    {
      key: "sourceId",
      label: "Source ID",
      type: "string",
      required: true,
      placeholder: "cnon:card-nonce-ok",
      hint:
        "A payment token from the Web/In-App Payments SDK, a stored card id, or the literal `CASH` or `EXTERNAL`.",
    },
    amountMoney,
    currency,
    {
      key: "tipAmount",
      label: "Tip amount",
      type: "number",
      hint: "In minor units, charged in addition to Amount.",
      validation: { min: 0, integer: true },
    },
    locationId(false, "Defaults to the seller's main location."),
    { key: "customerId", label: "Customer ID", type: "string" },
    {
      key: "orderId",
      label: "Order ID",
      type: "string",
      hint: "Associates a previously created order with this payment.",
    },
    {
      key: "autocomplete",
      label: "Complete immediately",
      type: "boolean",
      hint:
        "Leave off to authorise now and capture later with a separate call. Square's own default is true.",
    },
    { key: "buyerEmailAddress", label: "Buyer email", type: "string" },
    {
      key: "referenceId",
      label: "Reference ID",
      type: "string",
      hint: "Your own id for this payment, up to 40 characters.",
      validation: { maxLength: 40 },
    },
    { key: "note", label: "Note", type: "text" },
    {
      key: "statementDescriptionIdentifier",
      label: "Statement description",
      type: "string",
      hint: "Extra text on the buyer's card statement, up to 20 characters.",
      validation: { maxLength: 20 },
    },
    idempotencyKeyParam(MAX_IDEMPOTENCY_KEY),
  ],
  output: [
    { key: "payment", type: "object", label: "Payment" },
    { key: "errors", type: "array", label: "Errors reported alongside a 2xx" },
  ],

  execute(input, ctx) {
    return new SquareClient(ctx).request("/payments", {
      body: {
        idempotency_key: idempotencyKey(ctx, input.idempotencyKey, MAX_IDEMPOTENCY_KEY),
        source_id: input.sourceId,
        amount_money: money(input.amount, input.currency),
        tip_money: money(input.tipAmount, input.currency),
        location_id: unset(input.locationId),
        customer_id: unset(input.customerId),
        order_id: unset(input.orderId),
        reference_id: unset(input.referenceId),
        note: unset(input.note),
        autocomplete: input.autocomplete,
        buyer_email_address: unset(input.buyerEmailAddress),
        statement_description_identifier: unset(input.statementDescriptionIdentifier),
      },
    });
  },
};

export default paymentCreate;
