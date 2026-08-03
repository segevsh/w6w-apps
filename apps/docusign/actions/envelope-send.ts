import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  resendEnvelope?: boolean;
}

/**
 * `PUT /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}` with
 * `{ "status": "sent" }` — `Envelopes: update`. This is how a draft becomes an
 * envelope out for signature; Docusign has no dedicated `/send` route.
 *
 * `resend_envelope` is the query flag that re-notifies recipients who have not
 * yet completed. On an envelope that is already `sent` it is the only thing
 * this action does.
 *
 * **Not idempotent, and the reason is `resendEnvelope`.** Replaying the call
 * with the flag off is harmless — the envelope is already `sent` and the target
 * state is unchanged — but with the flag on, every replay emails the recipients
 * again. Since one action carries both behaviours, the honest declaration is
 * the unsafe one.
 */
const envelopeSend: ActionDefinition<Input> = {
  key: "envelope-send",
  type: "perform",
  resource: "envelope",
  title: "Send Envelope",
  description:
    "Send a draft envelope for signature by moving it to the `sent` status, optionally re-notifying recipients.",
  idempotent: false,
  params: [
    envelopeIdParam,
    {
      key: "resendEnvelope",
      label: "Resend to recipients",
      type: "boolean",
      default: false,
      hint:
        "Re-send the notification email to recipients who have not completed. Emails go out again on every run.",
    },
  ],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "statusDateTime", type: "string", label: "Status at" },
  ],

  execute(input, ctx) {
    ctx.log("info", "sending Docusign envelope", { envelopeId: input.envelopeId });
    return new DocusignClient(ctx).request(`/envelopes/${encodeURIComponent(input.envelopeId)}`, {
      method: "PUT",
      query: { resend_envelope: input.resendEnvelope },
      body: { status: "sent" },
    });
  },
};

export default envelopeSend;
