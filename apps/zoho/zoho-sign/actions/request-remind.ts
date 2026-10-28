import type { ActionDefinition } from "@w6w/types";
import { ZohoSignClient } from "../lib/client.ts";
import { requestId, statusOutput } from "../lib/params.ts";

interface Input {
  requestId: string;
}

/**
 * `POST /requests/{request_id}/remind` — verified against
 * `document-managment/remind-recipient.html`. Emails the recipient(s) who still need to sign.
 * No request body.
 */
const action: ActionDefinition<Input> = {
  key: "request-remind",
  type: "perform",
  resource: "request",
  title: "Remind Recipient",
  description: "Send a reminder email to whoever still needs to sign this request.",
  // Every call emails real people again — not safe to retry blindly.
  idempotent: false,
  params: [requestId],
  output: statusOutput,

  execute(input, ctx) {
    return new ZohoSignClient(ctx).sendEmpty(
      `/requests/${encodeURIComponent(input.requestId)}/remind`,
      "POST",
    );
  },
};

export default action;
