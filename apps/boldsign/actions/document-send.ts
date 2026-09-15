import type { ActionDefinition } from "@w6w/types";
import { BoldSignClient, compact } from "../lib/client.ts";

interface Input {
  title?: string;
  message?: string;
  fileUrls: string[];
  signers: unknown;
  cc?: string[];
  enableSigningOrder?: boolean;
  expiryValue?: number;
  brandId?: string;
  onBehalfOf?: string;
}

/**
 * `POST /v1/document/send` — send one or more files out for signature.
 *
 * **No file upload.** BoldSign's `SendForSign` schema accepts either a
 * `multipart/form-data` file upload (`files`) or a `fileUrls` array of public
 * URLs BoldSign fetches server-side. This app's Actions run in a sandbox
 * whose `ctx.fetch` stringifies every request body on its way out (a real
 * multipart body cannot survive that trip), so only `fileUrls` is reachable
 * here — the file(s) must already be hosted somewhere BoldSign can fetch them
 * from over HTTPS.
 *
 * `signers` is a JSON array of BoldSign `DocumentSigner` objects (at minimum
 * `name` + `emailAddress`); this app does not attempt to model signature
 * field placement (`formFields`, page coordinates) as flat params — pass it
 * through inside each signer object exactly as BoldSign's own docs show, or
 * omit `formFields` entirely to let BoldSign auto-detect fields (with
 * `AutoDetectFields`) or leave the document field-free.
 */
const documentSend: ActionDefinition<Input> = {
  key: "document-send",
  type: "perform",
  resource: "document",
  title: "Send Document",
  description: "Send one or more files (by URL) out for signature.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", validation: { maxLength: 256 } },
    { key: "message", label: "Message", type: "text", validation: { maxLength: 5000 } },
    {
      key: "fileUrls",
      label: "File URLs",
      type: "array",
      required: true,
      item: { type: "string", placeholder: "https://example.com/agreement.pdf" },
      hint:
        "Public HTTPS URLs BoldSign will fetch. A direct file upload is not supported by this " +
        "action — see the module doc.",
    },
    {
      key: "signers",
      label: "Signers",
      type: "json",
      required: true,
      hint: 'Array of signer objects, e.g. [{"name":"Jane Doe","emailAddress":"jane@example.com",' +
        '"signerOrder":1}].',
    },
    {
      key: "cc",
      label: "CC",
      type: "array",
      item: { type: "string", placeholder: "someone@example.com" },
      hint: "Email addresses to CC once the document is completed.",
    },
    {
      key: "enableSigningOrder",
      label: "Enforce signing order",
      type: "boolean",
      default: false,
      hint: "Signers must sign in ascending `signerOrder` when enabled.",
    },
    {
      key: "expiryValue",
      label: "Expires in (days)",
      type: "number",
      hint: "Defaults to BoldSign's own default (60 days) when omitted.",
    },
    { key: "brandId", label: "Brand ID", type: "string", advanced: true },
    {
      key: "onBehalfOf",
      label: "On behalf of",
      type: "string",
      advanced: true,
      hint: "A verified Sender Identity email to send as, instead of the account's own address.",
    },
  ],
  output: [{ key: "documentId", type: "string", label: "Document ID" }],

  execute(input, ctx) {
    const cc = input.cc?.length
      ? input.cc.filter(Boolean).map((emailAddress) => ({ emailAddress }))
      : undefined;

    return new BoldSignClient(ctx).request("/document/send", {
      method: "POST",
      body: compact({
        title: input.title,
        message: input.message,
        fileUrls: input.fileUrls,
        signers: input.signers,
        cc,
        enableSigningOrder: input.enableSigningOrder,
        expiryValue: input.expiryValue,
        brandId: input.brandId,
        onBehalfOf: input.onBehalfOf,
      }),
    });
  },
};

export default documentSend;
