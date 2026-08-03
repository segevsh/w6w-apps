import type { ActionDefinition } from "@w6w/types";
import { INVOICE_FIELDS, JobberClient } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

const QUERY = `
  query GetInvoice($id: EncodedId!) {
    invoice(id: $id) {
      ${INVOICE_FIELDS}
      invoiceNet
      contractDisclaimer
      lineItems(first: 50) {
        nodes { id name description quantity unitPrice totalPrice taxable }
        pageInfo { hasNextPage endCursor }
      }
      paymentRecords(first: 25) {
        nodes {
          id
          amount
          tipAmount
          adjustmentType
          entryDate
          jobberPaymentPaymentMethod
          jobberPaymentLast4
          jobberPaymentTransactionStatus
        }
        pageInfo { hasNextPage endCursor }
      }
      jobs(first: 10) { nodes { id jobNumber } }
    }
  }
`;

/**
 * `paymentRecords` is why an invoice is worth fetching singly: `amounts` gives
 * the balance, but only the records say what has actually been collected and
 * how. Both connections are bounded — see `job-get` for why.
 *
 * The `jobberPayment*` fields are populated only for payments taken through
 * Jobber Payments, and return null for a cash or cheque entry recorded by hand.
 * `adjustmentType` is what distinguishes them.
 */
const invoiceGet: ActionDefinition<Input> = {
  key: "invoice-get",
  type: "read",
  resource: "invoice",
  title: "Get Invoice",
  description:
    "Fetch one invoice by id, with its line items, payment records and the jobs it bills.",
  params: [{ key: "invoiceId", label: "Invoice ID", type: "string", required: true }],
  output: [{ key: "invoice", type: "object", label: "The invoice, or null" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, { id: input.invoiceId });
  },
};

export default invoiceGet;
