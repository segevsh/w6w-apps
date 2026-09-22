import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCardlessClient } from "../lib/client.ts";

/**
 * `GET /mandates/{id}` — one mandate.
 *
 * The read a workflow makes before collecting: `status` says whether the mandate
 * is `active` (and therefore usable by `create-payment`), `scheme` says which
 * bank rail the debit will ride, and `links.customer_bank_account` is the
 * account that will be debited. GoCardless returns the full bank-account object
 * too, which is the merchant's own customer's data and nothing belonging to this
 * app.
 */
interface Input {
  mandateId: string;
}

const getMandate: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-mandate",
  type: "read",
  resource: "mandate",
  title: "Get Mandate",
  description: "Fetch one mandate, including its current status and the bank account it debits.",
  params: [
    {
      key: "mandateId",
      label: "Mandate ID",
      type: "string",
      required: true,
      placeholder: "MD0000…",
      hint: "GoCardless's own mandate id, as returned by `list-mandates`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Mandate ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "scheme", type: "string", label: "Scheme" },
    { key: "reference", type: "string", label: "Reference" },
    { key: "created_at", type: "string", label: "Created at" },
    {
      key: "links",
      type: "object",
      label: "Linked resources (customer, customer_bank_account, creditor)",
    },
  ],

  execute(input, ctx) {
    return new GoCardlessClient(ctx).one("mandates", `/mandates/${encodeId(input.mandateId)}`);
  },
};

export default getMandate;
