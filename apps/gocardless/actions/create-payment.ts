import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GoCardlessClient } from "../lib/client.ts";
import { amountParam, currencyParam, idempotencyKeyParam, metadataParam } from "../lib/params.ts";

/**
 * `POST /payments` — collect a single payment against a mandate.
 *
 * ## The mandate is the whole authorisation
 *
 * `links.mandate` is required: a payment is a debit of a specific mandate, and
 * there is no way to debit a customer's bank account without one. The mandate
 * must be `active` — GoCardless answers `invalid_state` otherwise — so the usual
 * shape is `list-mandates` (status `active`) → `create-payment`.
 *
 * ## `charge_date` is a request, not a promise
 *
 * It is the earliest date GoCardless may collect: the debit lands on the next
 * possible banking day, which the bank scheme's own calendar decides. Omit it
 * and GoCardless uses the earliest date it can.
 *
 * ## Idempotency
 *
 * `idempotencyKey` is optional and falls back to this workflow step's invocation
 * id, per GoCardless's own guidance: "A network timeout that causes you to retry
 * without one can result in the same payment being taken twice." If the key was
 * already used, GoCardless answers `409 idempotent_creation_conflict` naming the
 * payment the first call created, and this app surfaces that id in the error
 * rather than a bare 409.
 *
 * ## Amounts are integers
 *
 * `amount` is in the currency's lowest denomination — pence for GBP, cents for
 * EUR. `1000` is £10.00.
 */
interface Input {
  amount: number;
  currency: string;
  mandateId: string;
  description?: string;
  chargeDate?: string;
  reference?: string;
  retryIfPossible?: boolean;
  metadata?: unknown;
  idempotencyKey?: string;
}

const createPayment: ActionDefinition<Input, Record<string, unknown>> = {
  key: "create-payment",
  type: "perform",
  resource: "payment",
  title: "Create Payment",
  description:
    "Collect a one-off payment from a customer's bank account against an active mandate. The " +
    "amount is an integer in the currency's lowest denomination.",
  idempotent: false,
  params: [
    amountParam(),
    currencyParam(true),
    {
      key: "mandateId",
      label: "Mandate ID",
      type: "string",
      required: true,
      placeholder: "MD0000…",
      hint: "The active mandate to collect against — sent as `links.mandate`. An inactive " +
        "mandate is refused by GoCardless with `invalid_state`.",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      hint: "The payment description shown to the customer and on the GoCardless dashboard.",
    },
    {
      key: "chargeDate",
      label: "Charge date",
      type: "date",
      hint: "Sent as `charge_date`: the earliest date GoCardless may collect. The actual debit " +
        "lands on the next possible banking day, per the bank scheme's own calendar. Omit it " +
        "to let GoCardless choose the earliest available date.",
    },
    {
      key: "reference",
      label: "Reference",
      type: "string",
      hint: "Your own reference, typically an invoice number — returned in the payout's own " +
        "reference and in webhook payloads.",
    },
    {
      key: "retryIfPossible",
      label: "Retry if possible",
      type: "boolean",
      advanced: true,
      hint: "Sent as `retry_if_possible`. When enabled, GoCardless may re-attempt a failed " +
        "collection instead of marking it failed outright.",
    },
    metadataParam(),
    idempotencyKeyParam(),
  ],
  output: [
    { key: "id", type: "string", label: "Payment ID" },
    { key: "amount", type: "number", label: "Amount (lowest denomination)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "status", type: "string", label: "Status" },
    { key: "charge_date", type: "string", label: "Charge date" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "links", type: "object", label: "Linked resources (mandate, creditor)" },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).create(
      "payments",
      "/payments",
      compact({
        amount: input.amount,
        currency: input.currency,
        description: input.description,
        charge_date: input.chargeDate,
        reference: input.reference,
        retry_if_possible: input.retryIfPossible,
        metadata: asOptionalJson(input.metadata, "Metadata"),
        links: { mandate: input.mandateId },
      }),
      input.idempotencyKey,
    );
  },
};

export default createPayment;
