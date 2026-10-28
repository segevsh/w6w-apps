import type { ActionDefinition } from "@w6w/types";
import { ZohoSignClient } from "../lib/client.ts";
import { requestId, statusOutput } from "../lib/params.ts";

interface Input {
  requestId: string;
  recallInProgress?: boolean;
  reason?: string;
}

/**
 * `PUT /requests/{request_id}/delete` — verified against
 * `document-managment/delete-document.html`. Moves the request to trash; it is not a hard
 * delete. Uses flat `multipart/form-data` fields (`recall_inprogress`, `reason`) — NOT the
 * `data={"requests":{...}}` envelope every other write endpoint in this app uses.
 */
const action: ActionDefinition<Input> = {
  key: "request-delete",
  type: "perform",
  resource: "request",
  title: "Delete Request",
  description: "Move a signature request to trash.",
  idempotent: true,
  params: [
    requestId,
    {
      key: "recallInProgress",
      label: "Recall If In Progress",
      type: "boolean",
      default: false,
      hint: "Set true when the request is still inprogress — Zoho Sign requires this to " +
        "confirm you mean to cancel an active signing flow, not just tidy up a draft.",
    },
    { key: "reason", label: "Reason", type: "string", hint: "Reason for recalling the document." },
  ],
  output: statusOutput,

  execute(input, ctx) {
    const fields: Record<string, string> = {};
    if (input.recallInProgress !== undefined) {
      fields.recall_inprogress = String(input.recallInProgress);
    }
    if (input.reason) fields.reason = input.reason;

    return new ZohoSignClient(ctx).sendMultipartFields(
      `/requests/${encodeURIComponent(input.requestId)}/delete`,
      "PUT",
      fields,
    );
  },
};

export default action;
