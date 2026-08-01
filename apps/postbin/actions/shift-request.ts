import type { ActionDefinition } from "@w6w/types";
import { type CollectedRequest, postbinRequest } from "../lib/client.ts";

interface Input {
  binId: string;
}

/**
 * GET /api/bin/:binId/req/shift — pops and returns the oldest request a bin
 * collected (FIFO). Despite the GET verb, PostBin's own docs say this
 * "changes the length of the array": it removes the element it returns, so
 * repeated calls walk the queue instead of re-reading the same request. That
 * side effect is why this is `perform`, not `read`, and why it is not
 * idempotent — retrying it after a failed response can silently skip ahead.
 */
const shiftRequest: ActionDefinition<Input, CollectedRequest> = {
  key: "shift-request",
  type: "perform",
  resource: "request",
  title: "Shift Next Request",
  description:
    "Pop and return the oldest request a bin collected. Removes it from the bin, so the next call returns the one after it.",
  idempotent: false,
  params: [
    { key: "binId", label: "Bin ID", type: "string", required: true },
  ],
  output: [
    { key: "method", type: "string", label: "HTTP method" },
    { key: "path", type: "string", label: "Path" },
    { key: "headers", type: "object", label: "Headers" },
    { key: "query", type: "object", label: "Query string" },
    { key: "body", type: "object", label: "Body" },
    { key: "ip", type: "string", label: "Sender IP" },
    { key: "binId", type: "string", label: "Bin ID" },
    { key: "inserted", type: "number", label: "Received at (ms epoch)" },
  ],

  execute(input, ctx) {
    return postbinRequest<CollectedRequest>(
      ctx,
      `/api/bin/${encodeURIComponent(input.binId)}/req/shift`,
    );
  },
};

export default shiftRequest;
