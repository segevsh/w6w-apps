import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /signature_request/release_hold/{signature_request_id}` — verified
 * against the official OpenAPI document (`signatureRequestReleaseHold`).
 *
 * A request created by an API App with **"hold request" enabled** is prepared
 * but not sent: nobody is emailed until it is released. This is the release.
 * On a request that was never on hold Dropbox Sign answers with an error, which
 * is surfaced as-is — pretending it succeeded would tell a workflow that mail
 * went out when it did not.
 */
const action: ActionDefinition = {
  key: "signature-request-release-hold",
  type: "perform",
  resource: "signature-request",
  title: "Release an on-hold request",
  description: "Send a signature request that was created on hold.",
  idempotent: true,
  params: [
    {
      key: "signatureRequestId",
      label: "Signature Request ID",
      type: "string",
      required: true,
      default: "",
    },
  ],
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "is_complete", type: "boolean", label: "Complete" },
    { key: "signatures", type: "array", label: "Per-signer status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.signatureRequestId ?? "").trim();
    if (!id) throw new Error("`signatureRequestId` is required");

    ctx.log("info", "releasing an on-hold Dropbox Sign request", { id });

    const res = await new DropboxSignClient(ctx).request<
      { signature_request?: Record<string, unknown> }
    >(`/signature_request/release_hold/${encodeURIComponent(id)}`, { method: "POST" });
    return res?.signature_request;
  },
};

export default action;
