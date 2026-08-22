import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient, json } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/recipient/update-many` — verified against Documenso's v2
 * OpenAPI document (required `envelopeId` and `data`).
 *
 * Correcting a typo in an address before sending is the common case. Each entry
 * needs the recipient's numeric `id`, which `envelope-get` returns — and which
 * is not the same as their position in the list.
 */
const action: ActionDefinition = {
  key: "envelope-recipient-update",
  type: "perform",
  resource: "recipient",
  title: "Update recipients",
  description: "Correct a recipient's address, name, role or signing order.",
  idempotent: true,
  params: [
    ENVELOPE_PARAM,
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"id":12,"email":"ada@example.com","name":"Ada Lovelace"}]',
      hint: "Each needs the recipient's numeric `id` from Get Envelope — not their position.",
    },
  ],
  output: [
    { key: "recipients", type: "array", label: "The recipients after the change" },
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
      if (r?.id === undefined || r.id === null || r.id === "") {
        throw new Error(`recipient ${i} has no \`id\` — updates are keyed by the recipient's id`);
      }
    }

    ctx.log("info", "updating Documenso recipients", { envelopeId, recipients: data.length });

    return await new DocumensoClient(ctx).request("/envelope/recipient/update-many", {
      method: "POST",
      body: { envelopeId, data },
    });
  },
};

export default action;
