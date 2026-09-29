import type { ActionDefinition } from "@w6w/types";
import { unwrapResource, ZohoSignClient } from "../lib/client.ts";
import { requestId } from "../lib/params.ts";

interface Input {
  requestId: string;
}

/**
 * `GET /requests/{request_id}` — verified against
 * `document-managment/get-details-of-a-particular-document.html`. Check `request_status`
 * (`draft`, `inprogress`, `completed`, `declined`, `expired`, `recalled`) for completion.
 */
const action: ActionDefinition<Input> = {
  key: "request-get",
  type: "read",
  resource: "request",
  title: "Get Request",
  description: "Get the full details and status of a signature request.",
  params: [requestId],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "request_status", type: "string", label: "Status" },
    { key: "sign_percentage", type: "number", label: "Percent complete" },
    { key: "actions", type: "array", label: "Recipients and their per-action status" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoSignClient(ctx).get(
      `/requests/${encodeURIComponent(input.requestId)}`,
    );
    return unwrapResource(body, "requests");
  },
};

export default action;
