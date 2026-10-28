import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, type BatchUpdateRequest, buildWriteControl } from "../lib/client.ts";

interface Input {
  formId: string;
  requests: BatchUpdateRequest[];
  includeFormInResponse?: boolean;
  targetRevisionId?: string;
  requiredRevisionId?: string;
}

/**
 * `forms.batchUpdate` — POST /v1/forms/{formId}:batchUpdate
 *
 * The escape hatch. The per-verb actions in this app each build a one-entry
 * `requests[]`; this one passes an arbitrary array straight through, so
 * anything the API grows before this app catches up is still reachable.
 *
 * Each entry is a `Request` union with exactly one populated key —
 * `updateFormInfo`, `updateSettings`, `createItem`, `moveItem`, `deleteItem`
 * or `updateItem`.
 */
const formBatchUpdate: ActionDefinition<Input> = {
  key: "form-batch-update",
  type: "perform",
  resource: "form",
  title: "Batch Update Form",
  description: "Apply a raw array of Google Forms update requests in one atomic batch.",
  idempotent: false,
  params: [
    { key: "formId", label: "Form ID or URL", type: "string", required: true },
    {
      key: "requests",
      label: "Requests",
      type: "json",
      required: true,
      hint:
        "Array of Request objects. Each has exactly one of: updateFormInfo, updateSettings, createItem, moveItem, deleteItem, updateItem.",
      placeholder: '[{"createItem":{"item":{"title":"Q1"},"location":{"index":0}}}]',
    },
    {
      key: "includeFormInResponse",
      label: "Include Form In Response",
      type: "boolean",
      hint: "Return the updated Form alongside the replies.",
    },
    {
      key: "targetRevisionId",
      label: "Target Revision ID",
      type: "string",
      hint: "Optimistic concurrency: apply against this revision, rebasing later changes.",
    },
    {
      key: "requiredRevisionId",
      label: "Required Revision ID",
      type: "string",
      hint: "Strict concurrency: fail unless the form is still at this revision.",
    },
  ],
  output: [
    { key: "form", type: "object", label: "Updated form (when requested)" },
    { key: "replies", type: "array", label: "One reply per request" },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    const requests = Array.isArray(input.requests) ? input.requests : [];
    if (requests.length === 0) throw new Error("`requests` must be a non-empty array");
    const writeControl = buildWriteControl(input.targetRevisionId, input.requiredRevisionId);
    return batchUpdate(ctx, input.formId, {
      requests,
      ...(input.includeFormInResponse ? { includeFormInResponse: true } : {}),
      ...(writeControl ? { writeControl } : {}),
    });
  },
};

export default formBatchUpdate;
