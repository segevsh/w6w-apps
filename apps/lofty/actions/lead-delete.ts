import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `DELETE /v1.0/leads/{leadId}?reason=<text>` — move a lead to the trash.
 *
 * ## The reason is required, and it is the point
 *
 * Lofty records `reason` for audit, and the spec marks it required rather than
 * optional. It is a query parameter, not a body, so it appears in the request
 * URL — which means it should describe the operation, never carry anything
 * sensitive.
 *
 * ## A soft delete
 *
 * The lead moves to the trash rather than disappearing: `Get Lead` with
 * `withTrash` still finds it. The response body is empty, so this action
 * returns the id and the HTTP status instead of pretending there is data.
 */
interface Input {
  leadId: number;
  reason: string;
}

const action: ActionDefinition<Input> = {
  key: "lead-delete",
  type: "perform",
  resource: "lead",
  title: "Delete Lead",
  description:
    "Move a lead to the trash, recording a required reason (DELETE /v1.0/leads/{leadId}).",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The `leadId` to trash.",
    },
    {
      key: "reason",
      label: "Reason",
      type: "string",
      required: true,
      hint: "Recorded with the operation for audit, and sent in the request URL — keep it " +
        "descriptive and non-sensitive.",
    },
  ],
  output: [
    { key: "leadId", type: "number", label: "Trashed lead ID" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new LoftyClient(ctx).status(`/leads/${input.leadId}`, {
      method: "DELETE",
      query: { reason: input.reason },
    });
    // The documented response body is empty; the status is the honest result.
    return { leadId: input.leadId, status };
  },
};

export default action;
