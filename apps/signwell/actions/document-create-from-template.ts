import type { ActionDefinition, Param } from "@w6w/types";
import { asJson, asJsonOptional, SignWellClient } from "../lib/client.ts";
import { bodyFromParams, DOCUMENT_OPTION_PARAMS, DOCUMENT_OUTPUT } from "../lib/params.ts";

const PARAMS: Param[] = [
  {
    key: "template_id",
    label: "Template id",
    type: "string",
    hint: "Use for a single template. Provide this or Template ids.",
  },
  {
    key: "template_ids",
    label: "Template ids",
    type: "json",
    hint: 'Array of template ids to combine into one document, e.g. ["…", "…"].',
  },
  {
    key: "recipients",
    label: "Recipients",
    type: "json",
    required: true,
    hint: 'Array of {"id", "placeholder_name", "name", "email"} — `placeholder_name` assigns the ' +
      "recipient to the template's placeholder. Optional: passcode, subject, message, " +
      'delivery_method ("email" | "sms" | "email_and_sms"), phone_number (E.164).',
  },
  {
    key: "template_fields",
    label: "Template fields to pre-fill",
    type: "json",
    hint: 'Array of {"api_id", "value"} — api_id is the field\'s API ID in the template and is ' +
      "case sensitive.",
  },
  ...DOCUMENT_OPTION_PARAMS,
  { key: "with_signature_page", label: "Add a signature page", type: "boolean" },
  {
    key: "exclude_placeholders",
    label: "Exclude placeholders",
    type: "json",
    hint: "Template placeholders to leave out of this document.",
  },
  { key: "attachment_requests", label: "Attachment requests", type: "json" },
  { key: "checkbox_groups", label: "Checkbox groups", type: "json" },
];

/**
 * `POST /api/v1/document_templates/documents` — verified against SignWell's OpenAPI document
 * (`createDocumentFromTemplate`). `recipients` is the one required body field; the template is
 * named by `template_id` or `template_ids`. Response is 201 with the document.
 */
const documentCreateFromTemplate: ActionDefinition = {
  key: "document-create-from-template",
  type: "perform",
  resource: "document",
  title: "Create a Document from a Template",
  description:
    "Create a document from one or more saved templates, assign recipients to the template's " +
    "placeholders, and pre-fill its fields. Sends to recipients unless Create as draft is on.",
  idempotent: false,
  params: PARAMS,
  output: [...DOCUMENT_OUTPUT, { key: "template_id", type: "string", label: "Template id" }],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    asJson(i.recipients, "recipients");
    const ids = asJsonOptional<unknown[]>(i.template_ids, "template_ids");
    if (!i.template_id && !(ids && ids.length > 0)) {
      throw new Error("Provide `template_id` or `template_ids`.");
    }
    ctx.log("info", "creating a SignWell document from a template", {
      invocation: ctx.invocation?.invocationId,
    });
    return await new SignWellClient(ctx).request("/document_templates/documents", {
      method: "POST",
      body: bodyFromParams(i, PARAMS),
    });
  },
};

export default documentCreateFromTemplate;
