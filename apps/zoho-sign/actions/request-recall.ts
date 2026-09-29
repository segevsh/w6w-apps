import type { ActionDefinition } from "@w6w/types";
import { ZohoSignClient } from "../lib/client.ts";
import { requestId, statusOutput } from "../lib/params.ts";

interface Input {
  requestId: string;
}

/**
 * `POST /requests/{request_id}/recall` — verified against
 * `document-managment/recall-document.html`. Cancels the signing process; recipients can no
 * longer view or sign it. No request body.
 */
const action: ActionDefinition<Input> = {
  key: "request-recall",
  type: "perform",
  resource: "request",
  title: "Recall Request",
  description: "Cancel an in-progress signature request. Recipients can no longer sign it.",
  idempotent: true,
  params: [requestId],
  output: [...statusOutput, {
    key: "action_time",
    type: "number",
    label: "Epoch ms of the recall",
  }],

  execute(input, ctx) {
    return new ZohoSignClient(ctx).sendEmpty(
      `/requests/${encodeURIComponent(input.requestId)}/recall`,
      "POST",
    );
  },
};

export default action;
