import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, unwrapResource, ZohoSignClient } from "../lib/client.ts";
import { actionsParam, notesParam, requestId } from "../lib/params.ts";

interface Input {
  requestId: string;
  actions: unknown;
  notes?: string;
}

/**
 * `POST /requests/{request_id}/submit` — verified against
 * `document-managment/send-document-for-signature.html`.
 *
 * Sends a draft (created by `request-create`) out for signature. Real recipients are
 * emailed from this call onward — this is the step with legal/notification consequences, not
 * `request-create`.
 *
 * `application/x-www-form-urlencoded`, body `data=<url-encoded JSON>` — a different encoding
 * from `request-create`'s multipart upload (see `lib/client.ts`'s header comment).
 *
 * Full field-placement control (exact x/y coordinates, per-field type, text styling) is part
 * of the documented payload but is a large, editor-shaped surface this action does not model
 * field-by-field; `actions` is passed through as raw JSON so a caller who has built that
 * payload elsewhere (or is using a document whose fields were already placed via text tags —
 * see `embedded-signing.html`) can submit it unmodified.
 */
const action: ActionDefinition<Input> = {
  key: "request-submit",
  type: "perform",
  resource: "request",
  title: "Send Document For Signature",
  description: "Submit a draft request (from Create Document) for signature.",
  idempotent: false,
  params: [
    requestId,
    actionsParam(
      "JSON array matching the action_id values Create Document returned, e.g. " +
        '[{"action_id":"1400...","action_type":"SIGN","recipient_name":"Alex James",' +
        '"recipient_email":"alex@example.com"}]. Add a `fields` object per action to place ' +
        "signature/text/checkbox fields — see send-document-for-signature.html for its shape.",
    ),
    notesParam,
  ],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "request_status", type: "string", label: "Status (e.g. inprogress)" },
  ],

  async execute(input, ctx) {
    const actions = parseJson(input.actions, "actions");
    const requests = compact({ notes: input.notes, actions });

    ctx.log("info", "submitting a Zoho Sign request for signature", { requestId: input.requestId });

    const body = await new ZohoSignClient(ctx).sendUrlEncoded(
      `/requests/${encodeURIComponent(input.requestId)}/submit`,
      "POST",
      { requests },
    );
    return unwrapResource(body, "requests");
  },
};

export default action;
