import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /signature_request/{signature_request_id}` — verified against the
 * official OpenAPI document (`signatureRequestGet`).
 *
 * The per-signer state lives in `signatures[].status_code`, not at the top
 * level: `is_complete` only turns true once **everyone** has signed, so a
 * workflow polling for "did Ada sign" must read the array.
 */
const action: ActionDefinition = {
  key: "signature-request-get",
  type: "read",
  resource: "signature-request",
  title: "Get a signature request",
  description: "Retrieve one signature request and each signer's status.",
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
    { key: "title", type: "string", label: "Title" },
    { key: "subject", type: "string", label: "Email subject" },
    { key: "is_complete", type: "boolean", label: "Complete — true only when ALL signers signed" },
    { key: "is_declined", type: "boolean", label: "Declined by a signer" },
    { key: "has_error", type: "boolean", label: "Errored" },
    { key: "test_mode", type: "boolean", label: "Test mode — false means legally binding" },
    { key: "signatures", type: "array", label: "Per-signer status (`status_code` per signer)" },
    { key: "custom_fields", type: "array", label: "Custom fields" },
    { key: "metadata", type: "object", label: "Metadata you set when sending" },
    { key: "files_url", type: "string", label: "Files URL" },
    { key: "details_url", type: "string", label: "Details URL" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.signatureRequestId ?? "").trim();
    if (!id) throw new Error("`signatureRequestId` is required");

    ctx.log("info", "getting a Dropbox Sign signature request", { id });

    const res = await new DropboxSignClient(ctx).request<
      { signature_request?: Record<string, unknown> }
    >(`/signature_request/${encodeURIComponent(id)}`);
    return res?.signature_request;
  },
};

export default action;
