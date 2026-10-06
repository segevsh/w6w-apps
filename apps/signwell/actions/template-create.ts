import type { ActionDefinition, Param } from "@w6w/types";
import { asJson, SignWellClient } from "../lib/client.ts";
import { bodyFromParams } from "../lib/params.ts";

const PARAMS: Param[] = [
  {
    key: "files",
    label: "Files",
    type: "json",
    required: true,
    hint: 'Array of {"name", "file_url"} or {"name", "file_base64"}.',
  },
  {
    key: "placeholders",
    label: "Placeholders",
    type: "json",
    required: true,
    hint: 'Signer roles: array of {"id", "name"} — optionally preassigned_recipient_name and ' +
      'preassigned_recipient_email. e.g. [{"id": "1", "name": "Client"}]',
  },
  { key: "name", label: "Template name", type: "string" },
  { key: "subject", label: "Email subject", type: "string" },
  { key: "message", label: "Email message", type: "text" },
  {
    key: "copied_placeholders",
    label: "Copied placeholders",
    type: "json",
    hint: "Roles that receive a copy of the final document.",
  },
  { key: "draft", label: "Create as draft", type: "boolean" },
  { key: "expires_in", label: "Expires in (days)", type: "number" },
  { key: "reminders", label: "Send reminders", type: "boolean" },
  { key: "apply_signing_order", label: "Apply signing order", type: "boolean" },
  { key: "text_tags", label: "Use text tags", type: "boolean" },
  { key: "redirect_url", label: "Redirect URL after signing", type: "string" },
  { key: "decline_redirect_url", label: "Redirect URL after decline", type: "string" },
  { key: "allow_decline", label: "Allow decline", type: "boolean" },
  { key: "allow_reassign", label: "Allow reassign", type: "boolean" },
  { key: "language", label: "Language", type: "string" },
  { key: "metadata", label: "Metadata", type: "json" },
  { key: "fields", label: "Fields", type: "json", hint: "Fields placed on the template files." },
  { key: "labels", label: "Labels", type: "json" },
];

/**
 * `POST /api/v1/document_templates` — verified against SignWell's OpenAPI document
 * (`createTemplate`). `files` and `placeholders` are the required body fields; response 201.
 */
const templateCreate: ActionDefinition = {
  key: "template-create",
  type: "perform",
  resource: "template",
  title: "Create a Template",
  description: "Create a reusable template from files, with named placeholders for the signers.",
  idempotent: false,
  params: PARAMS,
  output: [
    { key: "id", type: "string", label: "Template id" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "placeholders", type: "array", label: "Placeholders" },
    { key: "template_link", type: "string", label: "Template link" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    asJson(i.files, "files");
    asJson(i.placeholders, "placeholders");
    ctx.log("info", "creating a SignWell template", { invocation: ctx.invocation?.invocationId });
    return await new SignWellClient(ctx).request("/document_templates", {
      method: "POST",
      body: bodyFromParams(i, PARAMS),
    });
  },
};

export default templateCreate;
