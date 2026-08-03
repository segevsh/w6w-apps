import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { envelopeIdParam } from "../lib/params.ts";

interface Input {
  envelopeId: string;
  voidedReason: string;
}

/**
 * `PUT /restapi/v2.1/accounts/{accountId}/envelopes/{envelopeId}` with
 * `{ "status": "voided", "voidedReason": "…" }` — `Envelopes: update`. Voiding
 * cancels an in-flight envelope; recipients who have not finished can no longer
 * act on it.
 *
 * `voidedReason` is required by Docusign, not merely conventional — it is shown
 * to recipients in the void notification and recorded in the envelope's
 * certificate of completion, so it is marked `required` here rather than
 * defaulted to something bland.
 *
 * **Idempotent.** Voiding is a state assertion: a replay does not cancel a
 * second thing, and the end state after one call and after five is identical.
 * (Docusign answers a second void on an already-voided envelope with an error
 * rather than a success, which is a report about the envelope, not a duplicated
 * side effect.)
 */
const envelopeVoid: ActionDefinition<Input> = {
  key: "envelope-void",
  type: "perform",
  resource: "envelope",
  title: "Void Envelope",
  description: "Cancel an in-flight envelope, recording a reason shown to its recipients.",
  idempotent: true,
  params: [
    envelopeIdParam,
    {
      key: "voidedReason",
      label: "Reason",
      type: "text",
      required: true,
      hint:
        "Required by Docusign. Shown to recipients in the void notification and recorded on the certificate of completion.",
    },
  ],
  output: [
    { key: "envelopeId", type: "string", label: "Envelope ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "statusDateTime", type: "string", label: "Status at" },
  ],

  execute(input, ctx) {
    ctx.log("info", "voiding Docusign envelope", { envelopeId: input.envelopeId });
    return new DocusignClient(ctx).request(`/envelopes/${encodeURIComponent(input.envelopeId)}`, {
      method: "PUT",
      body: { status: "voided", voidedReason: input.voidedReason },
    });
  },
};

export default envelopeVoid;
