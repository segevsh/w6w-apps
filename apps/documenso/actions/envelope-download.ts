import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `GET /envelope/{envelopeId}/download` — verified against Documenso's v2
 * OpenAPI document.
 *
 * Returns a **download URL**, not the bytes — which is what makes it usable
 * from a sandbox that returns JSON rather than files. The URL is short-lived,
 * so a workflow that stores it and fetches it later gets nothing; fetch it in
 * the same run, or ask again.
 *
 * A completed envelope downloads the signed document with its certificate
 * page. A pending one downloads what has been signed so far, which is rarely
 * what anybody wants — `envelope-get`'s `status` is worth checking first.
 */
const action: ActionDefinition = {
  key: "envelope-download",
  type: "read",
  resource: "envelope",
  title: "Get a download link",
  description: "A short-lived URL for the envelope's document. Check it is completed first.",
  params: [ENVELOPE_PARAM],
  output: [
    { key: "downloadUrl", type: "string", label: "Short-lived download URL" },
    { key: "filename", type: "string", label: "Filename" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    ctx.log("info", "getting a Documenso download link", { envelopeId });

    return await new DocumensoClient(ctx).request(
      `/envelope/${encodeURIComponent(envelopeId)}/download`,
    );
  },
};

export default action;
