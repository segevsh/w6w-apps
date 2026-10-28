import type { ActionDefinition } from "@w6w/types";
import { compact, DropboxSignClient } from "../lib/client.ts";

/**
 * `POST /template/remove_user/{template_id}` — verified against the official
 * OpenAPI document (`templateRemoveUser`).
 */
const action: ActionDefinition = {
  key: "template-remove-user",
  type: "perform",
  resource: "template",
  title: "Remove a user from a template",
  description: "Revoke another account's access to a template.",
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

    ctx.log("info", "removing a user from a Dropbox Sign template", { id });

    const res = await new DropboxSignClient(ctx).request<
      { template?: Record<string, unknown> }
    >(`/template/remove_user/${encodeURIComponent(id)}`, {
      method: "POST",
      body: compact({ email_address: email, account_id: accountId }),
    });
    return res?.template;
  },
};

export default action;
