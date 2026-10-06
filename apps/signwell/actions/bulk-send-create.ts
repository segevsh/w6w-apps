import type { ActionDefinition, Param } from "@w6w/types";
import { asJson, SignWellClient } from "../lib/client.ts";
import { bodyFromParams } from "../lib/params.ts";

const PARAMS: Param[] = [
  {
    key: "template_ids",
    label: "Template ids",
    type: "json",
    required: true,
    hint:
      'Array of template ids, e.g. ["…"]. A template with a pre-applied signature or initials ' +
      "field cannot be used in a bulk send.",
  },
  {
    key: "bulk_send_csv",
    label: "CSV (base64)",
    type: "text",
    required: true,
    hint: "RFC 4648 base64 of the filled-in CSV — one row per document, columns per the " +
      "templates' placeholders.",
  },
  { key: "name", label: "Name", type: "string", hint: "Used as each document's name." },
  { key: "subject", label: "Email subject", type: "string" },
  { key: "message", label: "Email message", type: "text" },
  {
    key: "skip_row_errors",
    label: "Skip row errors",
    type: "boolean",
    hint: "Skip invalid CSV rows instead of failing. SignWell's default is off.",
  },
  { key: "apply_signing_order", label: "Apply signing order", type: "boolean" },
  { key: "custom_requester_name", label: "Custom requester name", type: "string" },
  { key: "custom_requester_email", label: "Custom requester email", type: "string" },
  { key: "api_application_id", label: "API application id", type: "string" },
];

/**
 * `POST /api/v1/bulk_sends` — verified against SignWell's OpenAPI document (`createBulkSend`).
 * `template_ids` and `bulk_send_csv` (base64) are required; response 201 is the bulk send
 * (`id`, `status`, `documents_count`, …); 422 on a bad CSV.
 */
const bulkSendCreate: ActionDefinition = {
  key: "bulk-send-create",
  type: "perform",
  resource: "bulk-send",
  title: "Create a Bulk Send",
  description: "Send one or more templates to many recipients at once from a base64 CSV.",
  idempotent: false,
  params: PARAMS,
  output: [
    { key: "id", type: "string", label: "Bulk send id" },
    { key: "status", type: "string", label: "Status" },
    { key: "documents_count", type: "number", label: "Documents created" },
    { key: "template_ids", type: "array", label: "Template ids" },
    { key: "created_at", type: "string", label: "Created" },
  ],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    asJson(i.template_ids, "template_ids");
    if (!i.bulk_send_csv) throw new Error("`bulk_send_csv` is required (base64 CSV).");
    ctx.log("info", "creating a SignWell bulk send", { invocation: ctx.invocation?.invocationId });
    return await new SignWellClient(ctx).request("/bulk_sends", {
      method: "POST",
      body: bodyFromParams(i, PARAMS),
    });
  },
};

export default bulkSendCreate;
