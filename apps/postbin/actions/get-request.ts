import type { ActionDefinition } from "@w6w/types";
import { type CollectedRequest, postbinRequest } from "../lib/client.ts";

interface Input {
  binId: string;
  requestId: string;
}

/**
 * GET /api/bin/:binId/req/:reqId — fetch one previously collected request by
 * its ID. Doesn't remove it from the bin (contrast with Shift Request).
 */
const getRequest: ActionDefinition<Input, CollectedRequest> = {
  key: "get-request",
  type: "read",
  resource: "request",
  title: "Get Request",
  description: "Fetch one request a bin collected, by its request ID. Leaves it in the bin.",
  params: [
    { key: "binId", label: "Bin ID", type: "string", required: true },
    {
      key: "requestId",
      label: "Request ID",
      type: "string",
      required: true,
      hint: "Returned as plain text when something is sent to the bin's request URL.",
    },
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
      `/api/bin/${encodeURIComponent(input.binId)}/req/${encodeURIComponent(input.requestId)}`,
    );
  },
};

export default getRequest;
