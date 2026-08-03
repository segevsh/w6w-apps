import type { ActionDefinition } from "@w6w/types";
import { JOB_FIELDS, JobberClient } from "../lib/client.ts";

interface Input {
  jobId: string;
}

const QUERY = `
  query GetJob($id: EncodedId!) {
    job(id: $id) {
      ${JOB_FIELDS}
      completedAndUninvoicedVisitsCount
      completedAndUninvoicedVisitsTotal
      lineItems(first: 50) {
        nodes { id name description quantity unitPrice totalPrice }
        pageInfo { hasNextPage endCursor }
      }
      visits(first: 25) {
        nodes { id title startAt endAt isComplete }
        pageInfo { hasNextPage endCursor }
      }
      quote { id quoteNumber quoteStatus }
      invoices(first: 10) { nodes { id invoiceNumber invoiceStatus } }
    }
  }
`;

/**
 * Every connection here carries an explicit `first`. That is not tidiness: a
 * connection with no `first`/`last` is costed as if it returned Jobber's
 * 100-node maximum, and nesting them multiplies. This query as written costs
 * roughly 550 points; the same query with the four bounds removed would be
 * budgeted near ten times that against a 10,000-point ceiling.
 */
const jobGet: ActionDefinition<Input> = {
  key: "job-get",
  type: "read",
  resource: "job",
  title: "Get Job",
  description:
    "Fetch one job by id, with its line items, visits, originating quote and any invoices raised from it.",
  params: [{ key: "jobId", label: "Job ID", type: "string", required: true }],
  output: [{ key: "job", type: "object", label: "The job, or null" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, { id: input.jobId });
  },
};

export default jobGet;
