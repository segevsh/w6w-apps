import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/duplicate` — verified against Documenso's v2 OpenAPI
 * document.
 *
 * Copies an envelope's documents, fields and recipient placeholders into a new
 * draft. Useful when the same contract goes out repeatedly and there is no
 * template — though a template plus `envelope-use` is the better shape if it
 * happens often, since a duplicate inherits whatever the original had at the
 * moment it was copied and then drifts.
 */
const action: ActionDefinition = {
  key: "envelope-duplicate",
  type: "perform",
  resource: "envelope",
  title: "Duplicate an envelope",
  description: "Copy an envelope into a new draft, documents and fields included.",
  // Two calls make two copies.
  idempotent: false,
  params: [ENVELOPE_PARAM],
  output: [
    { key: "id", type: "string", label: "The new envelope's id" },
    { key: "status", type: "string", label: "DRAFT" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    ctx.log("info", "duplicating a Documenso envelope", { envelopeId });

    return await new DocumensoClient(ctx).request("/envelope/duplicate", {
      method: "POST",
      body: { envelopeId },
    });
  },
};

export default action;
