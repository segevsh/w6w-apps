import type { ActionDefinition } from "@w6w/types";
import { ChargebeeClient, pathId } from "../lib/client.ts";

interface Input {
  invoiceId: string;
  amount?: number;
  paymentSourceId?: string;
  authorizationTransactionId?: string;
  paymentInitiator?: string;
  comment?: string;
}

/**
 * `POST /invoices/{invoice-id}/collect_payment` — attempt to collect payment on
 * an invoice.
 *
 * Chargebee has TWO `collect_payment` routes and they do different things:
 * `POST /customers/{id}/collect_payment` settles a customer's outstanding
 * balance across invoices, while this one targets a specific invoice. The
 * invoice-level route is what a workflow reaching for "retry this failed
 * payment" wants, so it is the one this App ships.
 *
 * `amount` is in the currency's SMALLEST UNIT (an integer — 1000 is $10.00), and
 * omitting it collects the full amount due. This action does not convert
 * anything: a float would silently truncate.
 *
 * `payment_initiator` (`customer` / `merchant`) drives strong-customer-
 * authentication handling. A background workflow retrying a dunning failure is
 * merchant-initiated; getting this wrong is a declined payment rather than a
 * cosmetic problem.
 *
 * ## Not idempotent, and this is the action where that matters most
 *
 * A retry attempts a SECOND charge. Chargebee supports an idempotency key on
 * this endpoint through the `chargebee-idempotency-key` request header, but this
 * App does not send one, so the runtime's own retry policy is the only thing
 * standing between a transient network error and a double charge. Declared
 * honestly rather than optimistically.
 */
const collectPayment: ActionDefinition<Input> = {
  key: "collect-payment",
  type: "perform",
  resource: "invoice",
  title: "Collect Payment For Invoice",
  description:
    "Attempt to collect payment against a specific invoice, in full or for a partial amount, " +
    "optionally charging a named payment source.",
  idempotent: false,
  params: [
    { key: "invoiceId", label: "Invoice ID", type: "string", required: true },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      hint: "Integer in the currency's smallest unit — 1000 is $10.00. Omit to collect the full " +
        "amount due.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "paymentSourceId",
      label: "Payment source ID",
      type: "string",
      hint:
        "Charge a specific stored payment source. Omit to use the customer's primary one. Find " +
        "ids with the List Payment Sources action.",
    },
    {
      key: "authorizationTransactionId",
      label: "Authorization transaction ID",
      type: "string",
      hint: "Capture a previously authorised transaction instead of making a fresh charge.",
    },
    {
      key: "paymentInitiator",
      label: "Payment initiator",
      type: "select",
      options: [
        { value: "customer", label: "Customer-initiated" },
        { value: "merchant", label: "Merchant-initiated" },
      ],
      hint: "Drives strong-customer-authentication handling. An unattended retry is " +
        "merchant-initiated.",
    },
    {
      key: "comment",
      label: "Comment",
      type: "text",
      hint: "Recorded against the collection attempt.",
    },
  ],
  output: [
    { key: "invoice", type: "object", label: "Invoice after the attempt" },
    { key: "transaction", type: "object", label: "Transaction created, if any" },
  ],

  execute(input, ctx) {
    ctx.log("info", "collecting payment", { invoiceId: input.invoiceId });
    return ChargebeeClient.fromConnection(ctx).request(
      `/invoices/${pathId(input.invoiceId)}/collect_payment`,
      {
        form: {
          amount: input.amount,
          payment_source_id: input.paymentSourceId,
          authorization_transaction_id: input.authorizationTransactionId,
          payment_initiator: input.paymentInitiator,
          comment: input.comment,
        },
      },
    );
  },
};

export default collectPayment;
