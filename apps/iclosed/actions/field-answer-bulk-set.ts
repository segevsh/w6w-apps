import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, IClosedClient } from "../lib/client.ts";

/**
 * `POST /v1/fields/answer/bulk` — Upsert one custom-field answer across many contacts.
 *
 * Verified 2026-10-06 against iClosed's OpenAPI 3.0 document
 * (`api-docs-iclosed.redocly.app/_bundle/openapi/v1/openapi.yaml`). The vendor's
 * parsed body is returned verbatim; see `lib/client.ts` for why nothing is unwrapped.
 */
interface Input {
  contactIds: unknown;
  customFieldId?: number;
  identifier?: string;
  answer?: unknown;
  overrideExisting?: boolean;
}

const fieldAnswerBulkSet: ActionDefinition<Input> = {
  key: "field-answer-bulk-set",
  type: "perform",
  resource: "field",
  title: "Bulk set field answers",
  description: "Upsert one custom-field answer across many contacts.",
  idempotent: true,
  params: [
    {
      key: "contactIds",
      label: "Contact IDs",
      type: "json",
      required: true,
      hint: "JSON array of integers.",
    },
    {
      key: "customFieldId",
      label: "Field ID",
      type: "number",
      validation: { integer: true },
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
      hint: "JSON array of strings.",
    },
    {
      key: "overrideExisting",
      label: "Override existing answers",
      type: "boolean",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Result message" },
  ],

  execute(input, ctx) {
    return new IClosedClient(ctx).json("/fields/answer/bulk", {
      method: "POST",
      body: compact({
        contactIds: asOptionalJson(input.contactIds, "Contact IDs"),
        customFieldId: input.customFieldId,
        identifier: input.identifier,
        answer: asOptionalJson(input.answer, "Answer"),
        overrideExisting: input.overrideExisting,
      }),
    });
  },
};

export default fieldAnswerBulkSet;
