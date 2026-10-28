import type { ActionDefinition } from "@w6w/types";
import { bool, compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /template/add_user/{template_id}` — verified against the official
 * OpenAPI document (`templateAddUser`).
 *
 * Grants another account access to *use* the template. Identify the person by
 * either `account_id` or `email_address`; the spec marks neither required
 * individually because one of the two must be present, so that rule is enforced
 * here rather than left to a 400.
 */
const action: ActionDefinition = {
  key: "template-add-user",
  type: "perform",
  resource: "template",
  title: "Share a template with a user",
  description: "Give another account access to use a template.",
  idempotent: true,
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true, default: "" },
    {
      key: "emailAddress",
      label: "Email Address",
      type: "string",
      default: "",
      hint: "Either this or an account id.",
    },
    { key: "accountId", label: "Account ID", type: "string", default: "" },
    {
      key: "skipNotification",
      label: "Skip Notification",
      type: "boolean",
      default: false,
      hint: "Grant access without emailing them about it.",
    },
  ],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "accounts", type: "array", label: "Accounts with access" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.templateId ?? "").trim();
    if (!id) throw new Error("`templateId` is required");
    const email = String(p.emailAddress ?? "").trim();
    const accountId = String(p.accountId ?? "").trim();
    if (!email && !accountId) {
      throw new Error("one of `emailAddress` or `accountId` is required");
    }

    ctx.log("info", "sharing a Dropbox Sign template", { id });

    const res = await new DropboxSignClient(ctx).request<
      { template?: Record<string, unknown> }
    >(`/template/add_user/${encodeURIComponent(id)}`, {
      method: "POST",
      body: compact({
        email_address: email,
        account_id: accountId,
        skip_notification: bool(p.skipNotification) || undefined,
      }),
    });
    return res?.template;
  },
};

export default action;
