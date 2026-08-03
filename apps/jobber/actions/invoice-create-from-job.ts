import type { ActionDefinition } from "@w6w/types";
import { INVOICE_FIELDS, JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  jobId: string;
}

const MUTATION = `
  mutation CreateInvoiceFromJob($jobId: EncodedId!, $origin: InvoiceOrigin!) {
    invoiceCreateFromJob(jobId: $jobId, origin: $origin) {
      invoice { ${INVOICE_FIELDS} }
      userErrors { message path }
    }
  }
`;

/**
 * Raise an invoice for completed work on a job.
 *
 * Jobber has a general `invoiceCreate` too, and it is deliberately NOT what
 * this action calls. `InvoiceCreateInput` makes `origin`, `dueDetails`, `tax`
 * and `clientId` all non-null and expects the caller to assemble the line
 * items, tax method and due terms itself — i.e. to re-derive from scratch what
 * Jobber already knows from the job. `invoiceCreateFromJob` takes two arguments
 * and lets Jobber carry across the client, property, uninvoiced line items and
 * the account's tax and payment-term defaults. For "bill this job", the second
 * is both simpler and more likely to be right.
 *
 * ## `origin` is pinned to `INTEGRATIONS`, not exposed
 *
 * `InvoiceOrigin` is a 13-value enum, and almost every value is a claim about
 * *where in Jobber's own UI* the invoice was raised — `NEW_MOBILE`,
 * `JOB_CLOSE_JOBBER_ONLINE`, `QUOTE_CONVERT_MOBILE`, `BATCH_INVOICE`. It feeds
 * Jobber's reporting on how their customers work. There is exactly one honest
 * value for an invoice created by a third-party integration, and it is
 * `INTEGRATIONS`. Offering the enum as a dropdown would let a workflow tell
 * Jobber a small lie on every run, so it does not.
 *
 * Not idempotent: run twice against a job with uninvoiced work and you get two
 * invoices. Jobber refuses when there is nothing left to bill, and that refusal
 * arrives through `userErrors` at HTTP 200.
 */
const invoiceCreateFromJob: ActionDefinition<Input> = {
  key: "invoice-create-from-job",
  type: "perform",
  resource: "invoice",
  title: "Create Invoice from Job",
  description:
    "Raise a draft invoice for a job's uninvoiced work. Client, property, line items, tax and payment terms carry over from the job.",
  idempotent: false,
  params: [
    {
      key: "jobId",
      label: "Job ID",
      type: "string",
      required: true,
      hint:
        "Use `job-list` with `Only invoiceable` to find jobs with work waiting to be billed, or read `uninvoicedTotal` off a job.",
    },
  ],
  output: [{ key: "invoice", type: "object", label: "The created draft invoice" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      jobId: input.jobId,
      origin: "INTEGRATIONS",
    });
    return unwrap(data, "invoiceCreateFromJob");
  },
};

export default invoiceCreateFromJob;
