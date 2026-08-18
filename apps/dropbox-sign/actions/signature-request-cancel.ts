import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /signature_request/cancel/{signature_request_id}` — verified against
 * the official OpenAPI document (`signatureRequestCancel`).
 *
 * **Cancel and remove are different, and the wrong one is destructive.**
 * `cancel` stops an *incomplete* request: signers can no longer sign, and the
 * request stays visible in the account. `remove` (a separate action) applies to
 * a *completed* one and permanently removes your access to it and its files.
 * Reaching for the wrong verb because both sound like "get rid of it" is the
 * mistake this note exists to prevent.
 *
 * The endpoint answers `200` with an empty body, so this returns a small
 * receipt rather than `undefined`.
 */
const action: ActionDefinition = {
  key: "signature-request-cancel",
  type: "perform",
  resource: "signature-request",
  title: "Cancel a signature request",
  description: "Stop an incomplete signature request. Signers can no longer sign it.",
  // Cancelling an already-cancelled request is not an error worth distinguishing.
  idempotent: true,
  params: [
    {
      key: "signatureRequestId",
      label: "Signature Request ID",
      type: "string",
      required: true,
      default: "",
      hint: "Must be an INCOMPLETE request — use Remove for a completed one.",
    },
  ],
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "cancelled", type: "boolean", label: "Cancelled" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.signatureRequestId ?? "").trim();
    if (!id) throw new Error("`signatureRequestId` is required");

    ctx.log("info", "cancelling a Dropbox Sign signature request", { id });

    await new DropboxSignClient(ctx).request(
      `/signature_request/cancel/${encodeURIComponent(id)}`,
      { method: "POST" },
    );
    return { signature_request_id: id, cancelled: true };
  },
};

export default action;
