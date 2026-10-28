import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /signature_request/update/{signature_request_id}` — verified against
 * the official OpenAPI document (`signatureRequestUpdate`; required
 * `signature_id`).
 *
 * **`signature_id` is not `signature_request_id`.** The request has one id; each
 * signer within it has their own `signature_id`, which is what this endpoint
 * takes. They look alike — both are long hex strings — and passing the request
 * id here fails with an error about the signature, not about the id. Read the
 * signer's id from `signature-request-get`'s `signatures[]`.
 *
 * Changing the email address **mints a new `signature_id`** for that signer, so
 * anything holding the old one (a stored embedded signing URL, a polling
 * workflow) is stale from that moment.
 */
const action: ActionDefinition = {
  key: "signature-request-update",
  type: "perform",
  resource: "signature-request",
  title: "Update a signer",
  description: "Correct one signer's email address or name, or move the expiry.",
  idempotent: true,
  params: [
    {
      key: "signatureRequestId",
      label: "Signature Request ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "signatureId",
      label: "Signature ID",
      type: "string",
      required: true,
      default: "",
      hint: "The SIGNER's id from `signatures[].signature_id` — not the request id above.",
    },
    {
      key: "emailAddress",
      label: "New Email Address",
      type: "string",
      default: "",
      hint: "Changing this mints a new signature_id, invalidating any URL you already have.",
    },
    { key: "name", label: "New Name", type: "string", default: "" },
    {
      key: "expiresAt",
      label: "New Expiry",
      type: "string",
      default: "",
      hint: "Unix timestamp.",
    },
  ],
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "signatures", type: "array", label: "Per-signer status, with the new signature_id" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.signatureRequestId ?? "").trim();
    if (!id) throw new Error("`signatureRequestId` is required");
    const signatureId = String(p.signatureId ?? "").trim();
    if (!signatureId) {
      throw new Error("`signatureId` is required — the signer's id, not the request's");
    }

    const body = compact({
      signature_id: signatureId,
      email_address: p.emailAddress,
      name: p.name,
      expires_at: p.expiresAt ? Number(p.expiresAt) : undefined,
    });
    if (Object.keys(body).length === 1) {
      throw new Error("nothing to update — set an email address, a name or an expiry");
    }

    ctx.log("info", "updating a Dropbox Sign signer", { id });

    const res = await new DropboxSignClient(ctx).request<
      { signature_request?: Record<string, unknown> }
    >(`/signature_request/update/${encodeURIComponent(id)}`, { method: "POST", body });
    return res?.signature_request;
  },
};

export default action;
