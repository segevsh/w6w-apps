import type { ActionDefinition } from "@w6w/types";
import { DocusignClient, jsonObject } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  recipients: unknown;
  resendEnvelope?: boolean;
}

/**
 * `POST /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}/recipients` —
 * `EnvelopeRecipients: create`, "Adds one or more recipients to an envelope".
 *
 * The body is Docusign's `envelopeRecipients` object — the same recipient-type
 * map `envelope-recipient-list` returns (`signers`, `carbonCopies`,
 * `certifiedDeliveries`, `editors`, `agents`, `inPersonSigners`,
 * `intermediaries`, `witnesses`, `notaries`, `seals`) — so it is passed through
 * as JSON rather than flattened. Each entry needs at minimum `email`, `name`
 * and a `recipientId` that is not already in use on the envelope.
 *
 * **Not idempotent.** A replay adds the recipients again (Docusign rejects a
 * duplicate `recipientId`, but a caller generating ids will get duplicates), and
 * with `resendEnvelope` on it re-notifies. Adding is not a state assertion.
 */
const envelopeRecipientAdd: ActionDefinition<Input> = {
  key: "envelope-recipient-add",
  type: "perform",
  resource: "recipient",
  title: "Add Envelope Recipients",
  description: "Add one or more recipients to an existing envelope.",
  idempotent: false,
  params: [
    envelopeIdParam,
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint:
        'JSON envelopeRecipients object, e.g. {"carbonCopies":[{"email":"cc@b.com","name":"C C","recipientId":"3","routingOrder":"2"}]}.',
    },
    {
      key: "resendEnvelope",
      label: "Resend to recipients",
      type: "boolean",
      default: false,
      hint: "Re-send the notification email to recipients who have not completed.",
    },
  ],
  output: [
    { key: "signers", type: "array", label: "Signers" },
    { key: "carbonCopies", type: "array", label: "Carbon copies" },
    { key: "recipientCount", type: "string", label: "Recipient count" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request(
      `/envelopes/${encodeURIComponent(input.envelopeId)}/recipients`,
      {
        method: "POST",
        query: { resend_envelope: input.resendEnvelope },
        body: jsonObject(input.recipients, "recipients"),
      },
    );
  },
};

export default envelopeRecipientAdd;
