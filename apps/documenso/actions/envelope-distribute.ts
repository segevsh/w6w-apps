import type { ActionDefinition } from "@w6w/types";
import { compact, DocumensoClient, json } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/distribute` — verified against Documenso's v2 OpenAPI
 * document (required `envelopeId`).
 *
 * **This is the act that emails people.** Creating an envelope, adding
 * recipients and placing fields all happen quietly; nothing reaches a signer
 * until this call. That is the two-step every e-signature API has, and the step
 * most often forgotten — a workflow that "sent" a contract and never called
 * this has a draft nobody can see.
 *
 * It is also the point of no return in the other direction: once distributed,
 * recipients and fields can no longer be changed. Get the envelope right first.
 */
const action: ActionDefinition = {
  key: "envelope-distribute",
  type: "perform",
  resource: "envelope",
  title: "Send an envelope for signature",
  description: "Email the envelope to its recipients. Nothing is sent until this runs.",
  // Distributing twice is refused by Documenso rather than sending twice.
  idempotent: true,
  params: [
    ENVELOPE_PARAM,
    {
      key: "meta",
      label: "Distribution Options",
      type: "json",
      default: "",
      placeholder: '{"subject":"Please sign","message":"Here is the contract."}',
      hint: "Subject, message and distribution method, as Documenso's `meta` object.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Envelope id" },
    { key: "status", type: "string", label: "Status after distribution" },
    { key: "recipients", type: "array", label: "Per-recipient state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    // Worth a warn: this is the call that puts a contract in front of a person.
    ctx.log("warn", "distributing a Documenso envelope", { envelopeId });

    return await new DocumensoClient(ctx).request("/envelope/distribute", {
      method: "POST",
      body: compact({ envelopeId, meta: json(p.meta, "meta") }),
    });
  },
};

export default action;
