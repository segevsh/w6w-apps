import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient, json } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/recipient/create-many` — verified against Documenso's v2
 * OpenAPI document (required `envelopeId` and `data`).
 *
 * **Only a draft envelope accepts new recipients.** Once distributed the
 * signing order and the audit trail are fixed, so this fails on a pending
 * envelope rather than quietly adding somebody to a contract already in
 * flight.
 *
 * `signingOrder` is what makes signing sequential — recipients sharing a number
 * are asked at the same time, and each distinct number waits for the one
 * before. Omitting it everywhere means everyone signs at once, which is often
 * right and occasionally very wrong.
 */
const action: ActionDefinition = {
  key: "envelope-recipient-add",
  type: "perform",
  resource: "recipient",
  title: "Add recipients",
  description: "Add signers to a draft envelope. Distributed envelopes are fixed.",
  // Two calls add the people twice.
  idempotent: false,
  params: [
    ENVELOPE_PARAM,
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"email":"ada@example.com","name":"Ada Lovelace","role":"SIGNER",' +
        '"signingOrder":1}]',
      hint: "Each needs `email`. `role` is SIGNER, APPROVER, CC or VIEWER; `signingOrder` makes " +
        "signing sequential.",
    },
  ],
  output: [
    { key: "recipients", type: "array", label: "The recipients as created, with their ids" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    const data = json(p.recipients, "recipients");
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("`recipients` is required — a non-empty array of recipient objects");
    }
    for (const [i, raw] of data.entries()) {
      const r = raw as Record<string, unknown>;
      if (!String(r?.email ?? "").trim()) throw new Error(`recipient ${i} has no \`email\``);
    }

    ctx.log("info", "adding Documenso recipients", { envelopeId, recipients: data.length });

    return await new DocumensoClient(ctx).request("/envelope/recipient/create-many", {
      method: "POST",
      body: { envelopeId, data },
    });
  },
};

export default action;
