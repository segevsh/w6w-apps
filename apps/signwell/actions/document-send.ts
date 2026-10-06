import type { ActionDefinition, Param } from "@w6w/types";
import { requireId, SignWellClient } from "../lib/client.ts";
import { bodyFromParams, DOCUMENT_OUTPUT, idParam } from "../lib/params.ts";

const OPTION_KEYS = [
  "name",
  "subject",
  "message",
  "test_mode",
  "reminders",
  "apply_signing_order",
  "expires_in",
  "redirect_url",
  "decline_redirect_url",
  "allow_decline",
  "allow_reassign",
  "embedded_signing",
  "custom_requester_name",
  "custom_requester_email",
  "api_application_id",
  "metadata",
  "labels",
];

const PARAMS: Param[] = [
  idParam("Document id", "A document created as a draft."),
  { key: "name", label: "Document name", type: "string" },
  { key: "subject", label: "Email subject", type: "string" },
  { key: "message", label: "Email message", type: "text" },
  { key: "test_mode", label: "Test mode", type: "boolean" },
  { key: "reminders", label: "Send reminders", type: "boolean" },
  { key: "apply_signing_order", label: "Apply signing order", type: "boolean" },
  { key: "expires_in", label: "Expires in (days)", type: "number" },
  { key: "redirect_url", label: "Redirect URL after signing", type: "string" },
  { key: "decline_redirect_url", label: "Redirect URL after decline", type: "string" },
  { key: "allow_decline", label: "Allow decline", type: "boolean" },
  { key: "allow_reassign", label: "Allow reassign", type: "boolean" },
  { key: "embedded_signing", label: "Embedded signing", type: "boolean" },
  { key: "custom_requester_name", label: "Custom requester name", type: "string" },
  { key: "custom_requester_email", label: "Custom requester email", type: "string" },
  { key: "api_application_id", label: "API application id", type: "string" },
  { key: "metadata", label: "Metadata", type: "json" },
  { key: "labels", label: "Labels", type: "json" },
];

/**
 * `POST /api/v1/documents/{id}/send` — verified against SignWell's OpenAPI document
 * (`sendDocument`, "Update and Send Document"). All body fields are optional; the response is 201
 * with the document. Sending notifies recipients, so a retry may notify them again.
 */
const documentSend: ActionDefinition = {
  key: "document-send",
  type: "perform",
  resource: "document",
  title: "Send a Document",
  description: "Send a draft document to its recipients, optionally updating its settings first.",
  idempotent: false,
  params: PARAMS,
  output: [...DOCUMENT_OUTPUT],

  async execute(input, ctx) {
    const i = input as Record<string, unknown>;
    const id = requireId(i.id);
    ctx.log("info", "sending a SignWell document", { id });
    const body = bodyFromParams(i, PARAMS.filter((p) => OPTION_KEYS.includes(p.key)));
    return await new SignWellClient(ctx).request(`/documents/${encodeURIComponent(id)}/send`, {
      method: "POST",
      body,
    });
  },
};

export default documentSend;
