import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient } from "../lib/client.ts";
import { ENVELOPE_PARAM, LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /envelope/{envelopeId}/audit-log` — verified against Documenso's v2
 * OpenAPI document.
 *
 * **This is the evidence.** For a signed document the audit trail — who opened
 * it, when, from which address, what they did — is what makes the signature
 * defensible, and it is the part `envelope-delete` destroys and a copy of the
 * PDF does not carry.
 *
 * Reading it into a workflow is how a compliance step archives that record
 * somewhere outside Documenso.
 */
const action: ActionDefinition = {
  key: "envelope-audit-log",
  type: "read",
  resource: "envelope",
  title: "Read an envelope's audit trail",
  description: "Who opened, viewed and signed an envelope — the evidence behind the signature.",
  params: [ENVELOPE_PARAM, ...LIST_PARAMS],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");
    const returnAll = p.returnAll === true;
    const limit = Number(p.limit ?? 50);

    ctx.log("info", "reading a Documenso audit log", { envelopeId, returnAll });

    return await new DocumensoClient(ctx).requestAll(
      `/envelope/${encodeURIComponent(envelopeId)}/audit-log`,
      {},
      returnAll ? Infinity : limit,
    );
  },
};

export default action;
