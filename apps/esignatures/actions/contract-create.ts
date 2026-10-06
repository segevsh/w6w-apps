import type { ActionDefinition } from "@w6w/types";
import {
  asJson,
  asOptionalJson,
  compact,
  ESignaturesClient,
  toList,
  yesNo,
} from "../lib/client.ts";

/**
 * `POST /api/contracts` — create a contract from a template and (by default) send it.
 *
 * `test: true` marks it a free "demo"; leaving it off creates a live, billable contract. The
 * vendor accepts no idempotency key, so a retry sends a second contract: `idempotent: false`.
 */
interface Input {
  templateId: string;
  title?: string;
  locale?: string;
  metadata?: string;
  expiresInHours?: number;
  customWebhookUrl?: string;
  assignedUserEmail?: string;
  labels?: string;
  test?: boolean;
  saveAsDraft?: boolean;
  signers: unknown;
  placeholderFields?: unknown;
  signerFields?: unknown;
  emails?: unknown;
  customBranding?: unknown;
}

const contractCreate: ActionDefinition<Input> = {
  key: "contract-create",
  type: "perform",
  resource: "contract",
  title: "Create Contract",
  description: "Create a contract from a template and send it to its signers for signature.",
  idempotent: false,
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true },
    {
      key: "signers",
      label: "Signers",
      type: "json",
      required: true,
      hint: 'Array of {"name", "email", "mobile", "company_name", "signing_order", "auto_sign", ' +
        '"signature_request_delivery_methods", "signed_document_delivery_method", ' +
        '"multi_factor_authentications", "redirect_url"}. Each needs a name and an email or mobile.',
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      hint: "Unique; defaults to the template title.",
    },
    {
      key: "test",
      label: "Test (demo) contract",
      type: "boolean",
      default: false,
      hint: "A demo contract is stamped and charges no fee. Off creates a live contract.",
    },
    {
      key: "saveAsDraft",
      label: "Save as draft",
      type: "boolean",
      default: false,
      hint: "Save for further editing in the UI instead of sending.",
    },
    {
      key: "placeholderFields",
      label: "Placeholder fields",
      type: "json",
      hint: 'Array of {"placeholder_key", "replace_with_text" | "replace_with_markdown" | ' +
        '"replace_with_template"}.',
    },
    {
      key: "signerFields",
      label: "Signer field defaults",
      type: "json",
      hint: 'Array of {"signer_field_id", "default_value"} to pre-fill signer input fields.',
    },
    { key: "locale", label: "Locale", type: "string", hint: "e.g. en, en-GB, de, fr, zh-CN." },
    {
      key: "metadata",
      label: "Metadata",
      type: "string",
      hint: "Custom data kept on the contract.",
    },
    { key: "expiresInHours", label: "Expires in (hours)", type: "number" },
    { key: "customWebhookUrl", label: "Custom webhook URL", type: "string" },
    { key: "assignedUserEmail", label: "Assigned user email", type: "string" },
    { key: "labels", label: "Labels", type: "string", hint: "Comma-separated." },
    {
      key: "emails",
      label: "Email overrides",
      type: "json",
      hint: "Object with signature_request_subject, signature_request_text, " +
        "final_contract_subject, final_contract_text, cc_email_addresses, reply_to.",
    },
    {
      key: "customBranding",
      label: "Custom branding",
      type: "json",
      hint: 'Object {"company_name", "logo_url"}.',
    },
  ],
  output: [
    { key: "status", type: "string", label: "queued" },
    { key: "contract", type: "object", label: "The contract, with each signer's sign_page_url" },
  ],

  async execute(input, ctx) {
    const body = compact({
      template_id: input.templateId,
      title: input.title,
      locale: input.locale,
      metadata: input.metadata,
      expires_in_hours: input.expiresInHours === undefined
        ? undefined
        : String(input.expiresInHours),
      custom_webhook_url: input.customWebhookUrl,
      assigned_user_email: input.assignedUserEmail,
      labels: toList(input.labels),
      test: yesNo(input.test),
      save_as_draft: yesNo(input.saveAsDraft),
      signers: asJson(input.signers, "signers"),
      placeholder_fields: asOptionalJson(input.placeholderFields, "placeholderFields"),
      signer_fields: asOptionalJson(input.signerFields, "signerFields"),
      emails: asOptionalJson(input.emails, "emails"),
      custom_branding: asOptionalJson(input.customBranding, "customBranding"),
    });
    const res = await new ESignaturesClient(ctx).call("/contracts", { method: "POST", body });
    return { status: res.status, contract: (res.data as { contract?: unknown })?.contract };
  },
};

export default contractCreate;
