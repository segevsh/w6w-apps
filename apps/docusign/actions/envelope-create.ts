import type { ActionDefinition } from "@w6w/types";
import { compact, DocusignClient, jsonArray, jsonObject } from "../lib/client.ts";

interface Input {
  emailSubject: string;
  emailBlurb?: string;
  status?: string;
  documents: unknown;
  recipients: unknown;
  additionalFields?: unknown;
}

/**
 * `POST /restapi/v2.1/accounts/{accountId}/envelopes` — `Envelopes: create`,
 * building an envelope from documents supplied inline.
 *
 * **`status` is the send switch.** `"created"` leaves a draft; `"sent"` puts the
 * envelope out for signature immediately. There is no separate "send" endpoint
 * for a new envelope — sending is a property of creation, and a draft is
 * promoted later with `envelope-send`. The default here is `"created"`, the
 * conservative choice: an action that emails other people the moment it runs
 * should be asked for, not assumed.
 *
 * **Documents and recipients are JSON.** Docusign's `documents[]` and
 * `recipients` (`signers`, `carbonCopies`, `certifiedDeliveries`, `editors`,
 * `agents`, `inPersonSigners`, `intermediaries`, `witnesses`, `notaries`,
 * `seals`, …) carry per-recipient tab definitions — anchor strings, absolute
 * page positions, tab types — that no flat param list can express without
 * inventing a schema Docusign does not have. They are passed through verbatim.
 *
 * A document entry needs at least `documentBase64`, `name`, `fileExtension` and
 * `documentId`; a signer needs `email`, `name` and `recipientId`. Docusign
 * validates the rest and its 400 is surfaced unchanged.
 *
 * **Not idempotent.** Every call creates a new envelope, and Docusign has no
 * idempotency-key header on this route, so a retry produces a second envelope
 * (and, at `status: "sent"`, a second round of emails).
 */
const envelopeCreate: ActionDefinition<Input> = {
  key: "envelope-create",
  type: "perform",
  resource: "envelope",
  title: "Create Envelope",
  description:
    "Create an envelope from inline documents and recipients, as a draft or sent immediately for signature.",
  idempotent: false,
  params: [
    {
      key: "emailSubject",
      label: "Email subject",
      type: "string",
      required: true,
      hint: "Subject line of the notification Docusign sends to recipients.",
    },
    { key: "emailBlurb", label: "Email message", type: "text" },
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "created",
      options: [
        { value: "created", label: "Draft (created)" },
        { value: "sent", label: "Send immediately (sent)" },
      ],
      hint: "`sent` emails the recipients as soon as the envelope is created.",
    },
    {
      key: "documents",
      label: "Documents",
      type: "json",
      required: true,
      hint:
        'JSON array of Docusign document objects, e.g. [{"documentBase64":"…","name":"NDA.pdf","fileExtension":"pdf","documentId":"1"}].',
    },
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint:
        'JSON envelopeRecipients object, e.g. {"signers":[{"email":"a@b.com","name":"A B","recipientId":"1","tabs":{"signHereTabs":[{"anchorString":"/sig1/"}]}}]}.',
    },
    {
      key: "additionalFields",
      label: "Additional fields",
      type: "json",
      hint:
        "JSON object merged into the envelopeDefinition — brandId, customFields, notification, eventNotification, etc.",
    },
  ],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "statusDateTime", type: "string", label: "Status at" },
    { key: "uri", type: "string", label: "Envelope URI" },
  ],

  execute(input, ctx) {
    const status = input.status ?? "created";
    const body = {
      ...jsonObject(input.additionalFields, "additionalFields"),
      ...compact({
        emailSubject: input.emailSubject,
        emailBlurb: input.emailBlurb,
        status,
      }),
      documents: jsonArray(input.documents, "documents"),
      recipients: jsonObject(input.recipients, "recipients"),
    };
    ctx.log("info", "creating Docusign envelope", { status });
    return new DocusignClient(ctx).request("/envelopes", { method: "POST", body });
  },
};

export default envelopeCreate;
