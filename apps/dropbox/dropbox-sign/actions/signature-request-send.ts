import type { ActionDefinition } from "@w6w/types";
import { bool, compact, csv, DropboxSignClient, json, parseSigners } from "../lib/client.ts";
import { FILE_URLS_PARAM, signersParam, TEST_MODE_PARAM } from "../lib/params.ts";

/**
 * `POST /signature_request/send` — verified against the official OpenAPI
 * document (`signatureRequestSend`).
 *
 * **This action can create a legally binding contract.** With Test Mode off it
 * emails real people, consumes plan quota, and produces a signature with legal
 * standing. Dropbox Sign's schema defaults `test_mode` to `false` and this app
 * keeps that default rather than choosing for you — see `TEST_MODE_PARAM`.
 *
 * **Documents go by URL, not by upload.** The endpoint accepts either
 * `application/json` with `file_urls` or `multipart/form-data` with `files`.
 * This app sends JSON: an App runs in a sandbox whose only outbound reach is
 * `ctx.fetch` to an allowlisted host, so it has no local file to attach and no
 * business reading one. Dropbox Sign fetches the URL itself.
 */
const action: ActionDefinition = {
  key: "signature-request-send",
  type: "perform",
  resource: "signature-request",
  title: "Send a signature request",
  description: "Email a document to one or more signers for signature.",
  // Sending twice sends two requests; Dropbox Sign does not dedupe.
  idempotent: false,
  params: [
    signersParam(false),
    FILE_URLS_PARAM,
    { key: "title", label: "Title", type: "string", default: "", hint: "Shown in the account." },
    { key: "subject", label: "Email Subject", type: "string", default: "" },
    { key: "message", label: "Email Message", type: "text", default: "" },
    {
      key: "ccEmailAddresses",
      label: "CC Email Addresses",
      type: "string",
      default: "",
      hint: "Comma-separated. They receive the finished document but do not sign.",
    },
    {
      key: "signingOrder",
      label: "Signing Order",
      type: "select",
      default: "parallel",
      options: [
        { value: "parallel", label: "Everyone at once" },
        { value: "sequential", label: "In the order given" },
      ],
      hint: "Sequential stamps `order` onto the signers in the order you listed them.",
    },
    {
      key: "allowDecline",
      label: "Allow Decline",
      type: "boolean",
      default: false,
      hint: "Give signers a decline button instead of only silence.",
    },
    {
      key: "expiresAt",
      label: "Expires At",
      type: "string",
      default: "",
      hint: "Unix timestamp. Requires a plan that supports expiring requests.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      default: "",
      placeholder: '{"order_id":"1234"}',
      hint: "Up to 10 keys, echoed back on every read and callback — the usual way to tie a " +
        "request to your own record.",
    },
    {
      key: "customFields",
      label: "Custom Fields",
      type: "json",
      default: "",
      placeholder: '[{"name":"Cost","value":"$20,000"}]',
    },
    {
      key: "useTextTags",
      label: "Use Text Tags",
      type: "boolean",
      default: false,
      hint: "Parse [sig|req|signer1] style tags in the document into fields.",
    },
    {
      key: "hideTextTags",
      label: "Hide Text Tags",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "useTextTags" }, true] },
    },
    TEST_MODE_PARAM,
  ],
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "is_complete", type: "boolean", label: "Complete" },
    { key: "test_mode", type: "boolean", label: "Test mode — false means legally binding" },
    { key: "signatures", type: "array", label: "Per-signer status" },
    { key: "signing_url", type: "string", label: "Signing URL" },
    { key: "details_url", type: "string", label: "Details URL" },
    { key: "warnings", type: "array", label: "Non-fatal warnings — a 200 can still carry these" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const signers = parseSigners(p.signers, false);
    const fileUrls = csv(p.fileUrls);
    if (!fileUrls) {
      throw new Error("`fileUrls` is required — this app sends documents by URL");
    }

    // Sequential signing is expressed as an `order` per signer, not a flag.
    const ordered = p.signingOrder === "sequential"
      ? signers.map((s, i) => ({ ...s, order: s.order ?? i }))
      : signers;

    const body = compact({
      signers: ordered,
      file_urls: fileUrls,
      title: p.title,
      subject: p.subject,
      message: p.message,
      cc_email_addresses: csv(p.ccEmailAddresses),
      allow_decline: bool(p.allowDecline) || undefined,
      expires_at: p.expiresAt ? Number(p.expiresAt) : undefined,
      metadata: json(p.metadata, "metadata"),
      custom_fields: json(p.customFields, "customFields"),
      use_text_tags: bool(p.useTextTags) || undefined,
      hide_text_tags: bool(p.hideTextTags) || undefined,
      test_mode: bool(p.testMode),
    });
    // `test_mode: false` is meaningful and must survive `compact`.
    body.test_mode = bool(p.testMode);

    ctx.log("info", "sending a Dropbox Sign signature request", {
      signers: ordered.length,
      documents: fileUrls.length,
      testMode: body.test_mode,
    });

    const res = await new DropboxSignClient(ctx).request<
      { signature_request?: Record<string, unknown>; warnings?: unknown[] }
    >("/signature_request/send", { method: "POST", body });

    // A 200 can carry warnings — an ignored field, a signer who already signed.
    // They are surfaced rather than dropped, because nothing else reports them.
    if (res?.warnings?.length) {
      ctx.log("warn", "Dropbox Sign accepted the request with warnings", {
        warnings: res.warnings,
      });
    }
    return { ...res?.signature_request, warnings: res?.warnings };
  },
};

export default action;
