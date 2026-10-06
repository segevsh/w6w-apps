import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam, optionalIdParam } from "../lib/params.ts";

interface Input {
  submissionId: number;
  responses?: unknown;
  editGuid?: string;
  assignToUserId?: number;
  unassign?: boolean;
  workflow?: unknown;
}

const submissionUpdate: ActionDefinition<Input> = {
  key: "submission-update",
  type: "perform",
  resource: "submission",
  title: "Update Submission",
  description:
    "Change values on an existing submission (PATCH). responses is a list of { value_id | entry_id, value, delete?, updated?, multi_key? }; an empty value clears a response. edit_guid makes a retry safe: the same edit_guid is applied once. Assign, claim, unassign and workflow handoffs ride on the same call.",
  idempotent: true,
  params: [
    idParam("submissionId", "Submission ID"),
    {
      key: "responses",
      label: "Responses",
      type: "json",
      hint:
        'JSON array, e.g. [{"value_id": 641347, "value": "Done"}]. Use entry_id instead of value_id to add a response the submission has no value for yet.',
    },
    {
      key: "editGuid",
      label: "Edit GUID",
      type: "string",
      hint:
        "Client-assigned id for this edit; a repeat of the same value is treated as already applied. Defaults to the invocation id.",
    },
    optionalIdParam(
      "assignToUserId",
      "Assign to user ID",
      "Your own id claims a pooled submission; another user's id reassigns it.",
    ),
    {
      key: "unassign",
      label: "Unassign",
      type: "boolean",
      hint: "Return the submission to the claimable pool.",
    },
    {
      key: "workflow",
      label: "Workflow handoff",
      type: "json",
      hint:
        '{ "handoff_id": 2, "handoff_user_id": 3 } to forward, a blank handoff_id to complete, or { "handoff_rejected": true, "handoff_rejected_note": "..." } to reject.',
    },
  ],
  output: [
    { key: "data", type: "object", label: "The updated submission" },
  ],

  execute(input, ctx) {
    const responses = asOptionalJson<unknown[]>(input.responses, "responses");
    if (input.assignToUserId !== undefined && input.unassign) {
      throw new Error("assignToUserId and unassign cannot be combined");
    }
    const body = compact({
      submission: { id: input.submissionId },
      edit_guid: input.editGuid || ctx.invocation?.invocationId,
      responses,
      next_assigned_workflow_user_id: input.assignToUserId,
      workflow: asOptionalJson(input.workflow, "workflow"),
    });
    // A blank value is the documented way to unassign, so it must survive `compact`.
    if (input.unassign) body.next_assigned_workflow_user_id = null;
    if (!responses && !input.workflow && !input.unassign && input.assignToUserId === undefined) {
      throw new Error("submission-update needs responses, an assignment change or a workflow");
    }
    return new GoCanvasClient(ctx).request(`/submissions/${encodeId(input.submissionId)}`, {
      method: "PATCH",
      body,
    });
  },
};

export default submissionUpdate;
