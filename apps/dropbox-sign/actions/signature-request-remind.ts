import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /signature_request/remind/{signature_request_id}` — verified against
 * the official OpenAPI document (`signatureRequestRemind`; required
 * `email_address`).
 *
 * A reminder is addressed to a **signer's email**, not to the request, which is
 * why one signer can be nudged without emailing everyone. `name` disambiguates
 * when two signers share an address — a real case on requests where one person
 * signs in two roles.
 *
 * The reminder is refused for a signer whose turn has not come in a sequential
 * request; that is Dropbox Sign's rule, and it surfaces as its error rather
 * than being second-guessed here.
 */
const action: ActionDefinition = {
  key: "signature-request-remind",
  type: "perform",
  resource: "signature-request",
  title: "Send a reminder",
  description: "Email one signer a reminder to sign.",
  // Reminding twice sends two emails.
  idempotent: false,
  params: [
    {
      key: "signatureRequestId",
      label: "Signature Request ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "emailAddress",
      label: "Signer Email",
      type: "string",
      required: true,
      default: "",
      hint: "The signer to remind — a reminder targets a person, not the whole request.",
    },
    {
      key: "name",
      label: "Signer Name",
      type: "string",
      default: "",
      hint: "Only needed when two signers share the same email address.",
    },
  ],
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "signatures", type: "array", label: "Per-signer status" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.signatureRequestId ?? "").trim();
    if (!id) throw new Error("`signatureRequestId` is required");
    const email = String(p.emailAddress ?? "").trim();
    if (!email) throw new Error("`emailAddress` is required — a reminder targets one signer");

    ctx.log("info", "reminding a Dropbox Sign signer", { id });

    const res = await new DropboxSignClient(ctx).request<
      { signature_request?: Record<string, unknown> }
    >(`/signature_request/remind/${encodeURIComponent(id)}`, {
      method: "POST",
      body: compact({ email_address: email, name: p.name }),
    });
    return res?.signature_request;
  },
};

export default action;
