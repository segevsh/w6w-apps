import type { Param } from "@w6w/types";
import { asJsonOptional, compact } from "./client.ts";

/** A required string id (SignWell ids are UUIDs). */
export function idParam(label: string, hint?: string): Param {
  return { key: "id", label, type: "string", required: true, hint };
}

/**
 * Build a request body from the caller's input, in the order the params are declared. `json`
 * params are parsed, `number` params arriving as text are coerced, and anything unset is omitted
 * (`false` and `0` survive).
 */
export function bodyFromParams(
  input: Record<string, unknown>,
  params: Param[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const p of params) {
    const v = input[p.key];
    if (v === undefined || v === null || v === "") continue;
    if (p.type === "json") out[p.key] = asJsonOptional(v, p.key);
    else if (p.type === "number") out[p.key] = Number(v);
    else out[p.key] = v;
  }
  return compact(out);
}

/**
 * Options that SignWell accepts identically on create-document, create-from-template and (a subset)
 * send. Field names are SignWell's own, verbatim, so a value maps one-to-one onto the API.
 */
export const DOCUMENT_OPTION_PARAMS: Param[] = [
  { key: "name", label: "Document name", type: "string" },
  {
    key: "subject",
    label: "Email subject",
    type: "string",
    hint: "Defaults to the account's default subject.",
  },
  {
    key: "message",
    label: "Email message",
    type: "text",
    hint: "Defaults to the account's default message.",
  },
  {
    key: "test_mode",
    label: "Test mode",
    type: "boolean",
    hint: "Test-mode documents do not count towards API billing and carry a watermark.",
  },
  {
    key: "draft",
    label: "Create as draft",
    type: "boolean",
    hint: "Keep the document editable instead of sending it. Use Send Document to send it later.",
  },
  { key: "reminders", label: "Send reminders", type: "boolean" },
  {
    key: "apply_signing_order",
    label: "Apply signing order",
    type: "boolean",
    hint: "Recipients sign one at a time, in the order of the recipients list.",
  },
  {
    key: "expires_in",
    label: "Expires in (days)",
    type: "number",
    hint: "SignWell rejects values over 365.",
  },
  { key: "redirect_url", label: "Redirect URL after signing", type: "string" },
  { key: "decline_redirect_url", label: "Redirect URL after decline", type: "string" },
  { key: "allow_decline", label: "Allow decline", type: "boolean" },
  { key: "allow_reassign", label: "Allow reassign", type: "boolean" },
  {
    key: "embedded_signing",
    label: "Embedded signing",
    type: "boolean",
    hint: "Return embedded signing URLs for your own site instead of emailing recipients.",
  },
  { key: "custom_requester_name", label: "Custom requester name", type: "string" },
  { key: "custom_requester_email", label: "Custom requester email", type: "string" },
  { key: "api_application_id", label: "API application id", type: "string" },
  {
    key: "metadata",
    label: "Metadata",
    type: "json",
    hint: 'Key/value object returned with the document, e.g. {"order": "1234"}.',
  },
  {
    key: "copied_contacts",
    label: "Copied contacts",
    type: "json",
    hint:
      'Array of {"name", "email"} that receive the final document, e.g. [{"email": "a@b.com"}].',
  },
  {
    key: "labels",
    label: "Labels",
    type: "json",
    hint: 'Array of {"name"} used to organize documents.',
  },
];

/** Document output fields shared by every action that returns a document. */
export const DOCUMENT_OUTPUT = [
  { key: "id", type: "string", label: "Document id" },
  { key: "name", type: "string", label: "Name" },
  { key: "status", type: "string", label: "Status (Draft, Created, Sent, Completed, …)" },
  { key: "test_mode", type: "boolean", label: "Test mode" },
  {
    key: "recipients",
    type: "array",
    label: "Recipients, with per-recipient status and signing URL",
  },
  { key: "files", type: "array", label: "Files" },
  { key: "created_at", type: "string", label: "Created" },
  { key: "updated_at", type: "string", label: "Updated" },
] as const;
