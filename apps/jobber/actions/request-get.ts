import type { ActionDefinition } from "@w6w/types";
import { JobberClient, REQUEST_FIELDS } from "../lib/client.ts";

interface Input {
  requestId: string;
}

const QUERY = `
  query GetRequest($id: EncodedId!) {
    request(id: $id) {
      ${REQUEST_FIELDS}
      isScheduled
      isArchivable
      assessment { id title startAt endAt isComplete completedAt }
      quotes(first: 10) { nodes { id quoteNumber quoteStatus } }
      jobs(first: 10) { nodes { id jobNumber jobStatus } }
    }
  }
`;

/**
 * The quote and job connections are the reason to fetch a request singly: they
 * are what says whether this request was ever acted on. Both are bounded at 10
 * rather than left open — an unbounded connection is costed as if it returned
 * Jobber's 100-node maximum.
 */
const requestGet: ActionDefinition<Input> = {
  key: "request-get",
  type: "read",
  resource: "request",
  title: "Get Request",
  description:
    "Fetch one work request by id, with its assessment and the quotes and jobs it produced.",
  params: [{ key: "requestId", label: "Request ID", type: "string", required: true }],
  output: [{ key: "request", type: "object", label: "The request, or null" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, { id: input.requestId });
  },
};

export default requestGet;
