import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient } from "../lib/client.ts";
import { documentIdParam } from "../lib/params.ts";

interface Input {
  documentId: string;
  signerEmail: string;
  redirectUrl?: string;
}

interface Output {
  signLink: string;
}

/**
 * `GET /v1/document/getEmbeddedSignLink` — a signing URL for one signer that
 * can be embedded in your own UI (an `<iframe>`), instead of BoldSign
 * emailing the signer directly. `signerEmail` must match a signer already on
 * the document (from `document-send` or a template send).
 */
const documentGetEmbeddedSignLink: ActionDefinition<Input, Output> = {
  key: "document-get-embedded-sign-link",
  type: "perform",
  resource: "document",
  title: "Get Embedded Signing Link",
  description: "Mint an embeddable signing link for one signer on a document.",
  idempotent: false,
  params: [
    documentIdParam,
    { key: "signerEmail", label: "Signer email", type: "string", required: true },
    {
      key: "redirectUrl",
      label: "Redirect URL",
      type: "string",
      hint: "Where BoldSign sends the signer's browser after they finish signing.",
    },
  ],
  output: [{ key: "signLink", type: "string", label: "Embedded signing URL" }],

  execute(input, ctx) {
    return new BoldSignClient(ctx).request<Output>("/document/getEmbeddedSignLink", {
      query: {
        DocumentId: input.documentId,
        SignerEmail: input.signerEmail,
        RedirectUrl: input.redirectUrl,
      },
    });
  },
};

export default documentGetEmbeddedSignLink;
