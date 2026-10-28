import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /embedded/sign_url/{signature_id}` — verified against the official
 * OpenAPI document (`embeddedSignUrl`).
 *
 * **Two things make this easy to misuse.**
 *
 * The id is the **signer's** `signature_id`, not the signature request's — the
 * same confusion `signature-request-update` guards against. One request yields
 * one URL per signer.
 *
 * The URL is **short-lived and single-purpose**: it expires (`expires_at`, a
 * matter of minutes) and it is meant to be handed straight to the embedded
 * signing widget, not stored. It is also, for as long as it lives, enough to
 * sign as that person — treat it as a credential, not as a link to email
 * around.
 *
 * Only works for requests created through the *embedded* endpoints; asking for
 * an ordinary emailed request's URL is an error from Dropbox Sign.
 */
const action: ActionDefinition = {
  key: "embedded-sign-url-get",
  type: "read",
  resource: "embedded",
  title: "Get an embedded signing URL",
  description: "Get the short-lived URL that lets one signer sign inside your own page.",
  params: [
    {
      key: "signatureId",
      label: "Signature ID",
      type: "string",
      required: true,
      default: "",
      hint: "The SIGNER's id from `signatures[].signature_id` — not the signature request id.",
    },
  ],
  output: [
    { key: "sign_url", type: "string", label: "Signing URL — expires, and signs as that person" },
    { key: "expires_at", type: "number", label: "Expiry (Unix time)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.signatureId ?? "").trim();
    if (!id) throw new Error("`signatureId` is required — the signer's id, not the request's");

    // Deliberately not logged: the response is effectively a bearer token for
    // that signer, so only the id it was asked for is recorded.
    ctx.log("info", "getting a Dropbox Sign embedded signing URL", { signatureId: id });

    const res = await new DropboxSignClient(ctx).request<
      { embedded?: Record<string, unknown> }
    >(`/embedded/sign_url/${encodeURIComponent(id)}`);
    return res?.embedded;
  },
};

export default action;
