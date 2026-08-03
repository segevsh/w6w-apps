import type { ActionDefinition } from "@w6w/types";
import { JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  invoiceId: string;
}

const MUTATION = `
  mutation MarkInvoiceAsSent($id: EncodedId!) {
    invoiceMarkAsSent(id: $id) {
      invoice { id invoiceNumber invoiceStatus issuedDate dueDate amounts { total invoiceBalance } }
      userErrors { message path }
    }
  }
`;

/**
 * Move an invoice out of draft.
 *
 * The name is Jobber's and it is slightly misleading: this **records** that the
 * invoice was sent — it changes the status from draft, which starts the clock
 * on the due date — it does not email anything to the client. Nothing in this
 * app sends mail on the account's behalf, which is a deliberate line: a
 * workflow that silently emails customers is a different and much larger
 * commitment than one that updates records.
 *
 * Idempotent: an already-sent invoice stays sent.
 *
 * The argument is `id`, not `invoiceId` — unlike `invoiceEdit`, `invoiceDelete`
 * and most of the invoice mutations. Jobber's inconsistency, transcribed rather
 * than smoothed over.
 */
const invoiceMarkAsSent: ActionDefinition<Input> = {
  key: "invoice-mark-as-sent",
  type: "perform",
  resource: "invoice",
  title: "Mark Invoice as Sent",
  description:
    "Take an invoice out of draft and record it as sent, which starts its payment terms. Does not email the client.",
  idempotent: true,
  params: [{ key: "invoiceId", label: "Invoice ID", type: "string", required: true }],
  output: [{ key: "invoice", type: "object", label: "The updated invoice" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      id: input.invoiceId,
    });
    return unwrap(data, "invoiceMarkAsSent");
  },
};

export default invoiceMarkAsSent;
