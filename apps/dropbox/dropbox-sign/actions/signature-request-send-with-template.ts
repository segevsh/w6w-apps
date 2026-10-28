import type { ActionDefinition } from "@w6w/types";
import { bool, compact, csv, DropboxSignClient, json, parseSigners } from "../lib/client.ts";
import { signersParam, TEST_MODE_PARAM } from "../lib/params.ts";

/**
 * `POST /signature_request/send_with_template` — verified against the official
 * OpenAPI document (`signatureRequestSendWithTemplate`; required
 * `template_ids` and `signers`).
 *
 * **The signer contract is different here, and the difference is quiet.** A
 * template names its signers by *role* ("Client", "Landlord"), so each signer
 * must carry a `role`; the positional `order` that the file-based send uses
 * means nothing. `parseSigners(…, true)` refuses a role-less signer locally
 * rather than letting the request land on the wrong role.
 *
 * Like every send, this creates a **legally binding** request with Test Mode
 * off.
 */
const action: ActionDefinition = {
  key: "signature-request-send-with-template",
  type: "perform",
  resource: "signature-request",
  title: "Send a signature request from a template",
  description: "Fill a saved template's roles and fields and send it for signature.",
  idempotent: false,
  params: [
    {
      key: "templateIds",
      label: "Template IDs",
      type: "string",
      required: true,
      default: "",
      hint: "Comma-separated. Several templates are merged into one request, in order.",
    },
    signersParam(true),
    {
      key: "ccs",
      label: "CC Roles",
      type: "json",
      default: "",
      placeholder: '[{"role":"Accounting","email_address":"ap@example.com"}]',
      hint: "The template's CC roles, each with an address. Not a plain address list.",
    },
    { key: "title", label: "Title", type: "string", default: "" },
    { key: "subject", label: "Email Subject", type: "string", default: "" },
    { key: "message", label: "Email Message", type: "text", default: "" },
    {
      key: "customFields",
      label: "Custom Fields",
      type: "json",
      default: "",
      placeholder: '[{"name":"Cost","value":"$20,000","editor":"Client"}]',
      hint: "Fills the template's custom fields by name.",
    },
    { key: "metadata", label: "Metadata", type: "json", default: "" },
    {
      key: "signingRedirectUrl",
      label: "Signing Redirect URL",
      type: "string",
      default: "",
      hint: "Where a signer lands after signing.",
    },
    TEST_MODE_PARAM,
  ],
  output: [
    { key: "signature_request_id", type: "string", label: "Signature request ID" },
    { key: "template_ids", type: "array", label: "Templates used" },
    { key: "is_complete", type: "boolean", label: "Complete" },
    { key: "test_mode", type: "boolean", label: "Test mode — false means legally binding" },
    { key: "signatures", type: "array", label: "Per-signer status" },
    { key: "details_url", type: "string", label: "Details URL" },
    { key: "warnings", type: "array", label: "Non-fatal warnings" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const templateIds = csv(p.templateIds);
    if (!templateIds) throw new Error("`templateIds` is required");
    const signers = parseSigners(p.signers, true);

    const body = compact({
      template_ids: templateIds,
      signers,
      ccs: json(p.ccs, "ccs"),
      title: p.title,
      subject: p.subject,
      message: p.message,
      custom_fields: json(p.customFields, "customFields"),
      metadata: json(p.metadata, "metadata"),
      signing_redirect_url: p.signingRedirectUrl,
    });
    body.test_mode = bool(p.testMode);

    ctx.log("info", "sending a Dropbox Sign template request", {
      templates: templateIds.length,
      signers: signers.length,
      testMode: body.test_mode,
    });

    const res = await new DropboxSignClient(ctx).request<
      { signature_request?: Record<string, unknown>; warnings?: unknown[] }
    >("/signature_request/send_with_template", { method: "POST", body });

    if (res?.warnings?.length) {
      ctx.log("warn", "Dropbox Sign accepted the request with warnings", {
        warnings: res.warnings,
      });
    }
    return { ...res?.signature_request, warnings: res?.warnings };
  },
};

export default action;
