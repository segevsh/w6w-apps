import type { ActionDefinition } from "@w6w/types";
import { compact, parseJson, unwrapResource, ZohoSignClient } from "../lib/client.ts";
import { notesParam, templateId } from "../lib/params.ts";

interface Input {
  templateId: string;
  requestName?: string;
  actions: unknown;
  fieldData?: unknown;
  notes?: string;
  isQuickSend?: boolean;
}

/**
 * `POST /templates/{template_id}/createdocument` — verified against
 * `template-managment/send-documents-using-template.html`. Fills a template's recipient roles
 * with real people and, when `isQuickSend` is true (the default), sends it for signature in
 * this one call — no separate `request-submit`.
 *
 * `is_quicksend` is documented as its own top-level `application/x-www-form-urlencoded`
 * field, sibling to `data`, not nested inside it — `lib/client.ts#sendUrlEncoded`'s
 * `extraFields` carries it there.
 *
 * `actions` must supply an entry for every role the template defines (the count cannot
 * change), each carrying `action_id` from `template-get`'s `document_fields`/`actions` plus
 * the real `recipient_name`/`recipient_email`. Setting `isQuickSend: false` creates the
 * envelope as a draft instead (its own `request_id` comes back), letting a caller attach an
 * additional document via `request-create`-style upload before calling `request-submit`.
 */
const action: ActionDefinition<Input> = {
  key: "template-create-document",
  type: "perform",
  resource: "template",
  title: "Send Document Using Template",
  description: "Fill a template's recipient roles with real people and send it for signature.",
  idempotent: false,
  params: [
    templateId,
    {
      key: "requestName",
      label: "Request Name",
      type: "string",
      hint: "Defaults to the template's own name.",
    },
    {
      key: "actions",
      label: "Actions (recipients)",
      type: "json",
      required: true,
      hint: 'JSON array, one entry per template role, e.g. [{"action_id":"2000...",' +
        '"action_type":"SIGN","role":"ts1","recipient_name":"John Martin",' +
        '"recipient_email":"john@example.com","verify_recipient":true,' +
        '"verification_type":"EMAIL"}].',
    },
    {
      key: "fieldData",
      label: "Field Data",
      type: "json",
      hint: "Pre-fill values for the template's document_fields, e.g. " +
        '{"field_text_data":{},"field_boolean_data":{},"field_date_data":{}}.',
    },
    notesParam,
    {
      key: "isQuickSend",
      label: "Send Immediately",
      type: "boolean",
      default: true,
      hint: "false creates a draft (its own request_id) instead of sending right away.",
    },
  ],
  output: [
    { key: "request_id", type: "string", label: "Request ID" },
    { key: "request_status", type: "string", label: "Status" },
  ],

  async execute(input, ctx) {
    const actions = parseJson(input.actions, "actions");
    const fieldData = parseJson(input.fieldData, "fieldData", false);

    const templates = compact({
      request_name: input.requestName,
      field_data: fieldData,
      actions,
      notes: input.notes,
    });

    ctx.log("info", "sending a document using a Zoho Sign template", {
      templateId: input.templateId,
      quickSend: input.isQuickSend ?? true,
    });

    const body = await new ZohoSignClient(ctx).sendUrlEncoded(
      `/templates/${encodeURIComponent(input.templateId)}/createdocument`,
      "POST",
      { templates },
      { is_quicksend: String(input.isQuickSend ?? true) },
    );
    return unwrapResource(body, "requests");
  },
};

export default action;
