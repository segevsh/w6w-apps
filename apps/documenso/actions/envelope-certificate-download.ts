import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `GET /envelope/{envelopeId}/certificate/download` — verified against
 * Documenso's v2 OpenAPI document.
 *
 * The **signing certificate** is the separate PDF that records who signed,
 * when, and from where — the document you produce when somebody disputes a
 * signature. It is not the contract, and it is not included when you download
 * the document itself, which is why it has its own action.
 *
 * Like the document download, this returns a short-lived URL rather than bytes.
 */
const action: ActionDefinition = {
  key: "envelope-certificate-download",
  type: "read",
  resource: "envelope",
  title: "Get the signing certificate",
  description: "A link to the certificate PDF — the record produced when a signature is disputed.",
  params: [ENVELOPE_PARAM],
  output: [
    { key: "downloadUrl", type: "string", label: "Short-lived download URL" },
    { key: "filename", type: "string", label: "Filename" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    ctx.log("info", "getting a Documenso signing certificate", { envelopeId });

    return await new DocumensoClient(ctx).request(
      `/envelope/${encodeURIComponent(envelopeId)}/certificate/download`,
    );
  },
};

export default action;
