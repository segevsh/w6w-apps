import type { ActionDefinition } from "@w6w/types";
import { JobberClient, unwrap } from "../lib/client.ts";

interface Input {
  quoteId: string;
}

const MUTATION = `
  mutation ApproveQuote($id: EncodedId!) {
    quoteApprove(id: $id) {
      quote { id quoteNumber quoteStatus transitionedAt amounts { total } }
      userErrors { message path }
    }
  }
`;

/**
 * Records approval **on behalf of the client** — the "they said yes over the
 * phone" path, as distinct from the client approving it themselves in Client
 * Hub. It moves the quote to `approved`; it does not create the job. That is
 * `job-create-from-quote`, and keeping the two separate matches Jobber's own
 * model, where `approved` and `converted` are different statuses.
 *
 * Marked idempotent: approving an already-approved quote is a no-op status-wise.
 * Jobber rejects an approval that is illegal from the quote's current status
 * (an archived quote, say) through `userErrors` at HTTP 200, which `unwrap`
 * raises.
 *
 * Note the argument is plain `id`, where the other quote mutations take
 * `quoteId`. That inconsistency is Jobber's, and it is transcribed rather than
 * normalised.
 */
const quoteApprove: ActionDefinition<Input> = {
  key: "quote-approve",
  type: "perform",
  resource: "quote",
  title: "Approve Quote",
  description:
    "Mark a quote approved on the client's behalf. Does not convert it into a job — use Create Job from Quote for that.",
  idempotent: true,
  params: [{ key: "quoteId", label: "Quote ID", type: "string", required: true }],
  output: [{ key: "quote", type: "object", label: "The approved quote" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      id: input.quoteId,
    });
    return unwrap(data, "quoteApprove");
  },
};

export default quoteApprove;
