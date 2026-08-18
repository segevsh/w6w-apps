import type { ActionDefinition } from "@w6w/types";
import { compact, DocumensoClient } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/cancel` — verified against Documenso's v2 OpenAPI document
 * (required `envelopeId`).
 *
 * **Cancel and delete are different, and only one of them is recoverable.**
 * Cancelling stops a pending envelope: recipients can no longer sign, and the
 * envelope stays in the account with its audit trail intact — which is what a
 * "we sent the wrong version" workflow wants. `envelope-delete` removes it
 * entirely.
 *
 * The `reason` is shown to recipients and recorded in the audit log, so it is
 * worth filling in rather than leaving someone to guess why a contract they
 * were about to sign vanished.
 */
const action: ActionDefinition = {
  key: "envelope-cancel",
  type: "perform",
  resource: "envelope",
  title: "Cancel an envelope",
  description: "Stop a pending envelope. Recipients cannot sign it; the record stays.",
  idempotent: true,
  params: [
    ENVELOPE_PARAM,
    {
      key: "reason",
      label: "Reason",
      type: "text",
      default: "",
      hint: "Shown to recipients and recorded in the audit log.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Envelope id" },
    { key: "status", type: "string", label: "Status after cancelling" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    ctx.log("warn", "cancelling a Documenso envelope", { envelopeId });

    return await new DocumensoClient(ctx).request("/envelope/cancel", {
      method: "POST",
      body: compact({ envelopeId, reason: p.reason }),
    });
  },
};

export default action;
