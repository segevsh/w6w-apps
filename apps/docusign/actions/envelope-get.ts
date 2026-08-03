import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  include?: string;
  advancedUpdate?: boolean;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}` —
 * `Envelopes: get`. Docusign's own summary is "Gets the status of a single
 * envelope", which is why this app has no separate "get envelope status"
 * action for one envelope: the status *is* the envelope resource. The batch
 * case has its own endpoint and lives in `envelope-status-list`.
 *
 * `advanced_update` is exposed because it changes what the response contains
 * (it is the flag Docusign requires before a subsequent `PUT` may modify
 * recipients, tabs or documents in place), not merely how it is formatted.
 */
const envelopeGet: ActionDefinition<Input> = {
  key: "envelope-get",
  type: "read",
  resource: "envelope",
  title: "Get Envelope",
  description: "Fetch one envelope, including its current status.",
  params: [
    envelopeIdParam,
    {
      key: "include",
      label: "Include",
      type: "string",
      hint:
        "Comma-separated extras: custom_fields, documents, attachments, extensions, folders, recipients, powerform, tabs, payment_tabs.",
    },
    {
      key: "advancedUpdate",
      label: "Advanced update",
      type: "boolean",
      hint:
        "Return the envelope in the form Docusign requires before an advanced (recipient/tab/document) update.",
    },
  ],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "emailSubject", type: "string", label: "Email subject" },
    { key: "sentDateTime", type: "string", label: "Sent at" },
    { key: "completedDateTime", type: "string", label: "Completed at" },
    { key: "statusChangedDateTime", type: "string", label: "Status changed at" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request(`/envelopes/${encodeURIComponent(input.envelopeId)}`, {
      query: {
        include: input.include,
        advanced_update: input.advancedUpdate,
      },
    });
  },
};

export default envelopeGet;
