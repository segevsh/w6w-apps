import type { ActionDefinition, Param } from "@w6w/types";
import { asJson, SignWellClient } from "../lib/client.ts";
import { bodyFromParams, DOCUMENT_OPTION_PARAMS, DOCUMENT_OUTPUT } from "../lib/params.ts";

const PARAMS: Param[] = [
  {
    key: "files",
    label: "Files",
    type: "json",
    required: true,
    hint: 'Array of {"name", "file_url"} or {"name", "file_base64"}. file_url must be publicly ' +
      'reachable; file_base64 is RFC 4648 base64. e.g. [{"name": "nda.pdf", "file_url": "https://…"}]',
  },
  {
    key: "recipients",
    label: "Recipients",
    type: "json",
    required: true,
    hint:
      'Array of {"id", "name", "email"} — `id` is yours to choose (1, 2, …) and ties fields to ' +
      "recipients. Optional per recipient: passcode, subject, message, delivery_method " +
      '("email" | "sms" | "email_and_sms"), phone_number (E.164).',
  },
  ...DOCUMENT_OPTION_PARAMS,
  {
    key: "with_signature_page",
    label: "Add a signature page",
    type: "boolean",
  },
  { key: "self_sign", label: "Self-sign mode", type: "boolean" },
  {
    key: "text_tags",
    label: "Use text tags",
    type: "boolean",
    hint: "Place fields from text tags in the file instead of the `fields` list.",
  },
  {
    key: "fields",
    label: "Fields",
    type: "json",
    hint: "Fields placed on the document, as SignWell's nested array-of-arrays (one inner array " +
      "per file). See the SignWell API reference for the field shape.",
  },
  { key: "attachment_requests", label: "Attachment requests", type: "json" },
  { key: "checkbox_groups", label: "Checkbox groups", type: "json" },
  { key: "conditional_rules", label: "Conditional rules", type: "json" },
];

/**
 * `POST /api/v1/documents` — verified against SignWell's OpenAPI document (`createDocument`).
 * `files` and `recipients` are the two required body fields; the response is 201 with the
 * document. Creating without `draft: true` sends it immediately.
 */
const documentCreate: ActionDefinition = {
  key: "document-create",
  type: "perform",
  resource: "document",
  title: "Create a Document",
  description:
    "Create a document from a file URL or base64 content and send it for signature (or keep it " +
    "as a draft). Sends to recipients unless Create as draft is on.",
  idempotent: false,
  params: PARAMS,
  output: [...DOCUMENT_OUTPUT],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    asJson(i.files, "files");
    asJson(i.recipients, "recipients");
    ctx.log("info", "creating a SignWell document", { invocation: ctx.invocation?.invocationId });
    return await new SignWellClient(ctx).request("/documents", {
      method: "POST",
      body: bodyFromParams(i, PARAMS),
    });
  },
};

export default documentCreate;
