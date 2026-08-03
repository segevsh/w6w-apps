import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}/form_data` —
 * `EnvelopeFormData: get`, "Returns envelope tab data for an existing
 * envelope".
 *
 * This is the action that answers "what did they actually type?". Everything
 * else in this app reports on the envelope's *lifecycle*; this returns the
 * values entered into its tabs — text fields, checkboxes, radio groups,
 * dropdowns — grouped per recipient under `recipientFormData`, with the
 * envelope's own custom fields alongside. It is what a workflow reads to push a
 * completed agreement's contents into a CRM or a database.
 *
 * It takes no query parameters at all — the endpoint has exactly one shape.
 */
const envelopeFormDataGet: ActionDefinition<Input> = {
  key: "envelope-form-data-get",
  type: "read",
  resource: "envelope",
  title: "Get Envelope Form Data",
  description:
    "Read the values recipients entered into an envelope's fields (tabs), grouped per recipient.",
  params: [envelopeIdParam],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope ID" },
    { key: "status", type: "string", label: "Envelope status" },
    { key: "recipientFormData", type: "array", label: "Per-recipient field values" },
    { key: "formData", type: "object", label: "Envelope-level field values" },
    { key: "emailSubject", type: "string", label: "Email subject" },
    { key: "sentDateTime", type: "string", label: "Sent at" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request(
      `/envelopes/${encodeURIComponent(input.envelopeId)}/form_data`,
    );
  },
};

export default envelopeFormDataGet;
