import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/fields/answer` — Upsert one custom-field answer for a contact or call. Identify the field by ID or identifier.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  customFieldId?: number;
  identifier?: string;
  answer?: unknown;
  contactId?: number;
  eventCallId?: number;
}

const fieldAnswerSet: ActionDefinition<Input> = {
  key: "field-answer-set",
  type: "perform",
  resource: "field",
  title: "Set field answer",
  description:
    "Upsert one custom-field answer for a contact or call. Identify the field by ID or identifier.",
  idempotent: true,
  params: [
    {
      key: "customFieldId",
      label: "Field ID",
      type: "number",
      validation: { integer: true },
      hint: "Give this or Identifier.",
    },
    {
      key: "identifier",
      label: "Field identifier",
      type: "string",
    },
    {
      key: "answer",
      label: "Answer",
      type: "json",
      hint: 'JSON array of strings, e.g. ["Yes"].',
    },
    {
      key: "contactId",
      label: "Contact ID",
      type: "number",
      validation: { integer: true },
    },
    {
      key: "eventCallId",
      label: "Call ID",
      type: "number",
      validation: { integer: true },
    },
  ],
  output: [
    { key: "contactId", type: "number", label: "Contact ID" },
    { key: "CustomFieldAnswer", type: "array", label: "Stored answers" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/fields/answer", {
      method: "POST",
      body: compact({
        customFieldId: input.customFieldId,
        identifier: input.identifier,
        answer: asOptionalJson(input.answer, "Answer"),
        contactId: input.contactId,
        eventCallId: input.eventCallId,
      }),
    });
  },
};

export default fieldAnswerSet;
