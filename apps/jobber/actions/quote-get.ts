import type { ActionDefinition } from "@w6w/types";
import { JobberClient, QUOTE_FIELDS } from "../lib/client.ts";

interface Input {
  quoteId: string;
}

const QUERY = `
  query GetQuote($id: EncodedId!) {
    quote(id: $id) {
      ${QUOTE_FIELDS}
      contractDisclaimer
      lineItems(first: 50) {
        nodes { id name description quantity unitPrice totalPrice taxable optional recommended }
        pageInfo { hasNextPage endCursor }
      }
      jobs(first: 10) { nodes { id jobNumber jobStatus } }
      request { id title }
    }
  }
`;

/**
 * The line items are the point of fetching a quote singly — the list query
 * returns totals but not what they are made of. Bounded at 50: line items are
 * the deepest connection in this app, and each node here selects 9 fields, so
 * an unbounded selection would be costed at Jobber's 100-node assumption for
 * ~900 points on its own.
 */
const quoteGet: ActionDefinition<Input> = {
  key: "quote-get",
  type: "read",
  resource: "quote",
  title: "Get Quote",
  description:
    "Fetch one quote by id, with its line items, totals, and any jobs it was converted into.",
  params: [{ key: "quoteId", label: "Quote ID", type: "string", required: true }],
  output: [{ key: "quote", type: "object", label: "The quote, or null" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, { id: input.quoteId });
  },
};

export default quoteGet;
