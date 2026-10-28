import type { ActionDefinition } from "@w6w/types";
import { DropboxSignClient } from "../lib/client.ts";

/**
 * `GET /template/{template_id}` — verified against the official OpenAPI
 * document (`templateGet`).
 *
 * This is where a template's **role names and custom field names** come from,
 * and both are needed to send with it: the send path matches signers by role
 * and fills fields by name. Reading this first is how a workflow avoids
 * guessing either.
 */
const action: ActionDefinition = {
  key: "template-get",
  type: "read",
  resource: "template",
  title: "Get a template",
  description: "Retrieve one template's roles, fields and documents.",
  params: [
    { key: "templateId", label: "Template ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "template_id", type: "string", label: "Template ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "message", type: "string", label: "Default message" },
    { key: "signer_roles", type: "array", label: "Signer roles — what a send must match" },
    { key: "cc_roles", type: "array", label: "CC roles" },
    { key: "custom_fields", type: "array", label: "Custom fields, by name" },
    { key: "documents", type: "array", label: "Documents and their form fields" },
    { key: "is_embedded", type: "boolean", label: "Embedded template" },
    { key: "updated_at", type: "number", label: "Updated (Unix time)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = String(p.templateId ?? "").trim();
    if (!id) throw new Error("`templateId` is required");

    ctx.log("info", "getting a Dropbox Sign template", { id });

    const res = await new DropboxSignClient(ctx).request<
      { template?: Record<string, unknown> }
    >(`/template/${encodeURIComponent(id)}`);
    return res?.template;
  },
};

export default action;
