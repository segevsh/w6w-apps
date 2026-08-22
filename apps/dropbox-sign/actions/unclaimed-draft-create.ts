import type { ActionDefinition } from "@w6w/types";
import { bool, compact, csv, DropboxSignClient, json, parseSigners } from "../lib/client.ts";
import { FILE_URLS_PARAM, TEST_MODE_PARAM } from "../lib/params.ts";

/**
 * `POST /unclaimed_draft/create` — verified against the official OpenAPI
 * document (`unclaimedDraftCreate`; required `type`).
 *
 * An unclaimed draft is a document nobody owns yet: it returns a
 * `claim_url` you hand to a person, and whoever opens it becomes the sender.
 * That is the point — it is how you let someone prepare and send a document
 * without giving them API access.
 *
 * **The claim URL is a bearer capability with a short life.** Anyone holding it
 * can claim the draft, once. It is not a link to post publicly.
 *
 * The `type` decides the shape of what gets claimed, and the two are not
 * interchangeable: `send_document` produces a file to send, `request_signature`
 * produces a signature request — and for that one, signers must carry both a
 * name and an email, which `parseSigners` enforces before anything is sent.
 */
const action: ActionDefinition = {
  key: "unclaimed-draft-create",
  type: "perform",
  resource: "unclaimed-draft",
  title: "Create an unclaimed draft",
  description: "Create a claimable draft and return the one-time URL that claims it.",
  idempotent: false,
  params: [
    {
      key: "type",
      label: "Type",
      type: "select",
      required: true,
      default: "request_signature",
      options: [
        { value: "request_signature", label: "Signature request (signers required)" },
        { value: "send_document", label: "Document to send" },
      ],
    },
    FILE_URLS_PARAM,
    {
      key: "signers",
      label: "Signers",
      type: "json",
      default: "",
      placeholder: '[{"email_address":"ada@example.com","name":"Ada Lovelace"}]',
      hint: "Required for a signature request — each needs `email_address` and `name`.",
      showIf: { "==": [{ var: "type" }, "request_signature"] },
    },
    { key: "subject", label: "Email Subject", type: "string", default: "" },
    { key: "message", label: "Email Message", type: "text", default: "" },
    {
      key: "ccEmailAddresses",
      label: "CC Email Addresses",
      type: "string",
      default: "",
      hint: "Comma-separated.",
    },
    { key: "metadata", label: "Metadata", type: "json", default: "" },
    {
      key: "signingRedirectUrl",
      label: "Signing Redirect URL",
      type: "string",
      default: "",
    },
    TEST_MODE_PARAM,
  ],
  output: [
    { key: "claim_url", type: "string", label: "One-time claim URL — hand it out like a password" },
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "expires_at", type: "number", label: "When the claim URL stops working (Unix time)" },
    { key: "test_mode", type: "boolean", label: "Test mode — false means legally binding" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const type = String(p.type ?? "request_signature");
    const fileUrls = csv(p.fileUrls);
    if (!fileUrls) {
      throw new Error("`fileUrls` is required — this app sends documents by URL");
    }
    // A signature request without signers is not a draft, it is a mistake.
    const signers = type === "request_signature" ? parseSigners(p.signers, false) : undefined;

    const body = compact({
      type,
      file_urls: fileUrls,
      signers,
      subject: p.subject,
      message: p.message,
      cc_email_addresses: csv(p.ccEmailAddresses),
      metadata: json(p.metadata, "metadata"),
      signing_redirect_url: p.signingRedirectUrl,
    });
    body.test_mode = bool(p.testMode);

    ctx.log("info", "creating a Dropbox Sign unclaimed draft", {
      type,
      testMode: body.test_mode,
    });

    const res = await new DropboxSignClient(ctx).request<
      { unclaimed_draft?: Record<string, unknown>; warnings?: unknown[] }
    >("/unclaimed_draft/create", { method: "POST", body });

    if (res?.warnings?.length) {
      ctx.log("warn", "Dropbox Sign accepted the draft with warnings", { warnings: res.warnings });
    }
    return { ...res?.unclaimed_draft, warnings: res?.warnings };
  },
};

export default action;
