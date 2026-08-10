import type { ActionDefinition } from "@w6w/types";
import { batchUpdate, type BatchUpdateRequest, buildWriteControl } from "../lib/client.ts";

interface Input {
  presentationId: string;
  requests: BatchUpdateRequest[];
  requiredRevisionId?: string;
}

/**
 * Generic escape hatch: pass a raw array of Google Slides `Request` objects
 * straight through to `presentations.batchUpdate`.
 *
 * The `Request` union has **44** members. This app ships a per-verb action for
 * the twelve that carry shallow, stable inputs; the rest — chart embedding,
 * line routing, z-order, every `update*Properties` request with its `fields`
 * mask and its deep style object — are reachable here, verbatim, rather than
 * being half-modelled behind a form. See the README for the full list and the
 * reasoning.
 *
 * Reference: https://developers.google.com/workspace/slides/api/reference/rest/v1/presentations/request
 */
const presentationBatchUpdate: ActionDefinition<Input> = {
  key: "presentation-batch-update",
  type: "perform",
  resource: "presentation",
  title: "Batch Update (raw)",
  description:
    "Send an arbitrary array of Google Slides `Request` objects to `presentations.batchUpdate`. Use the per-verb actions when one exists; this is the escape hatch for the rest of the 44-member union.",
  idempotent: false,
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "requests",
      label: "Requests (JSON array)",
      type: "json",
      required: true,
      hint:
        'Array of Google Slides `Request` objects, each with exactly one populated key, e.g. `[{ "createSlide": { "insertionIndex": 1 } }]`. Applied in order, atomically.',
    },
    {
      key: "requiredRevisionId",
      label: "Required Revision ID",
      type: "string",
      hint:
        "Optional. Slides' `WriteControl` has only this one arm — there is no `targetRevisionId`. If the presentation has moved on, Google rejects the whole batch with 400.",
    },
  ],
  output: [
    { key: "presentationId", type: "string", label: "Presentation ID" },
    {
      key: "replies",
      type: "array",
      label: "Replies — one per request, in order; `{}` where the request returns nothing",
    },
    { key: "writeControl", type: "object", label: "Resulting write control" },
  ],

  execute(input, ctx) {
    if (!Array.isArray(input.requests) || input.requests.length === 0) {
      throw new Error("`requests` must be a non-empty array of Google Slides Request objects");
    }
    const writeControl = buildWriteControl(input.requiredRevisionId);
    return batchUpdate(ctx, input.presentationId, {
      requests: input.requests,
      ...(writeControl ? { writeControl } : {}),
    });
  },
};

export default presentationBatchUpdate;
