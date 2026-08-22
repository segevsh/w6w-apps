import type { ActionDefinition } from "@w6w/types";
import { compact, csv, DocumensoClient } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/redistribute` — verified against Documenso's v2 OpenAPI
 * document.
 *
 * The nudge: re-sends the signing email to recipients who have not finished.
 * **It targets recipients, not the envelope** — naming none re-sends to
 * everyone still outstanding, which on a multi-party contract means emailing
 * people who are waiting their turn.
 */
const action: ActionDefinition = {
  key: "envelope-redistribute",
  type: "perform",
  resource: "envelope",
  title: "Resend a signing request",
  description: "Re-send the signing email to recipients who have not signed.",
  // Each call sends another email.
  idempotent: false,
  params: [
    ENVELOPE_PARAM,
    {
      key: "recipients",
      label: "Recipient IDs",
      type: "string",
      default: "",
      hint: "Comma-separated numeric ids. Blank re-sends to everyone still outstanding.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Envelope id" },
    { key: "recipients", type: "array", label: "Per-recipient state" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    const ids = csv(p.recipients)?.map((raw) => {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new Error(`recipient "${raw}" is not a numeric id`);
      return n;
    });

    ctx.log("info", "re-sending a Documenso envelope", {
      envelopeId,
      recipients: ids?.length ?? "everyone outstanding",
    });

    return await new DocumensoClient(ctx).request("/envelope/redistribute", {
      method: "POST",
      body: compact({ envelopeId, recipients: ids }),
    });
  },
};

export default action;
