import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GoCardlessClient } from "../lib/client.ts";
import { amountParam, idempotencyKeyParam, metadataParam } from "../lib/params.ts";

/**
 * `POST /refunds` — refund a collected payment, in full or in part.
 *
 * ## `total_amount_confirmation` is the vendor's double-refund guard
 *
 * GoCardless refuses the refund unless the total amount refunded for the payment
 * *after* this refund equals the value supplied here — so a workflow that has
 * already refunded part of a payment cannot be run twice by accident: the second
 * attempt supplies the same total as the first and is rejected, naming the
 * mismatch. Omitting it is allowed (the vendor documents it as optional) but
 * removes the guard, so it is worth setting on any refund a retry could reach.
 *
 * ## Only `links.payment` is exposed
 *
 * GoCardless's refund object also accepts a `links.mandate` form — refunding
 * against a whole mandate rather than a specific charge. That is a separately
 * restricted feature per the vendor's own schema notes, and its accounting is
 * not obviously "this payment was refunded", so this app builds only the
 * `payment` link. A refund against a mandate must be made in the GoCardless
 * dashboard.
 *
 * ## Idempotency
 *
 * Optional `idempotencyKey`, defaulted to this step's invocation id. A retried
 * create answers `409 idempotent_creation_conflict` naming the refund the first
 * call created, which this app surfaces rather than swallowing.
 */
interface Input {
  amount: number;
  paymentId: string;
  reference?: string;
  totalAmountConfirmation?: number;
  metadata?: unknown;
  idempotencyKey?: string;
}

const createRefund: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-refund",
  type: "perform",
  resource: "refund",
  title: "Create Refund",
  description:
    "Refund a collected payment in full or in part. Supply `totalAmountConfirmation` to have " +
    "GoCardless reject a refund that would double-refund the payment.",
  idempotent: false,
  params: [
    amountParam("Amount to refund"),
    {
      key: "paymentId",
      label: "Payment ID",
      type: "string",
      required: true,
      placeholder: "PM0000…",
      hint: "The collected payment to refund — sent as `links.payment`. Refunding against a " +
        "whole mandate instead is a separately restricted GoCardless feature and is not " +
        "offered here.",
    },
    {
      key: "reference",
      label: "Reference",
      type: "string",
      hint: "Your own reference for the refund, typically the credit note or return number.",
    },
    {
      key: "totalAmountConfirmation",
      label: "Total amount after this refund",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Sent as `total_amount_confirmation`. Strongly recommended: GoCardless refuses the " +
        "refund unless this equals the payment's total refunded amount AFTER this refund is " +
        "applied, which is the vendor's own guard against refunding twice.",
    },
    metadataParam(),
    idempotencyKeyParam(),
  ],
  output: [
    { key: "id", type: "string", label: "Refund ID" },
    { key: "amount", type: "number", label: "Amount (lowest denomination)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "links", type: "object", label: "Linked resources (payment, mandate)" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).create(
      "refunds",
      "/refunds",
      compact({
        amount: input.amount,
        reference: input.reference,
        total_amount_confirmation: input.totalAmountConfirmation,
        metadata: asOptionalJson(input.metadata, "Metadata"),
        links: { payment: input.paymentId },
      }),
      input.idempotencyKey,
    );
  },
};

export default createRefund;
