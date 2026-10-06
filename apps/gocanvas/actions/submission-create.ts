import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, GoCanvasClient, toList } from "../lib/client.ts";
import { departmentIdParam, optionalIdParam } from "../lib/params.ts";

interface Input {
  formId?: number;
  formGuid?: string;
  formVersion?: number;
  responses: unknown;
  guid?: string;
  departmentId?: number;
  recipients?: string;
  assignToUserId?: number;
  workflow?: unknown;
}

const submissionCreate: ActionDefinition<Input> = {
  key: "submission-create",
  type: "perform",
  resource: "submission",
  title: "Create Submission",
  description:
    "Create a text-only submission against a form. responses is a list of { entry_id | entry_guid, value, multi_key? } objects (get entry ids from Get Form with format minimal). Photos, videos and attachments need multipart upload and are not supported here. The guid is the vendor's duplicate guard, defaulting to this invocation id so a retry is not created twice.",
  idempotent: true,
  params: [
    optionalIdParam("formId", "Form ID", "Either Form ID or Form GUID identifies the form."),
    { key: "formGuid", label: "Form GUID", type: "string" },
    optionalIdParam(
      "formVersion",
      "Form version",
      "Recommended when identifying the form by GUID.",
    ),
    {
      key: "responses",
      label: "Responses",
      type: "json",
      required: true,
      hint:
        'JSON array, e.g. [{"entry_id": 123, "value": "Jane"}]. Looped forms add "multi_key" per response.',
    },
    {
      key: "guid",
      label: "Submission GUID",
      type: "string",
      hint: "Globally unique id used to prevent duplicates. Defaults to the invocation id.",
    },
    departmentIdParam,
    {
      key: "recipients",
      label: "Email recipients",
      type: "string",
      hint: "Comma-separated addresses to send a copy of the submission to.",
    },
    optionalIdParam(
      "assignToUserId",
      "Assign to user ID",
      "For forms with Assignments: create the submission already assigned to this user.",
    ),
    {
      key: "workflow",
      label: "Workflow handoff",
      type: "json",
      hint:
        'Forms with Workflow only: { "workflow_id": 1, "handoff_id": 2, "handoff_user_id": 3 }. A blank handoff_id completes the workflow.',
    },
  ],
  output: [
    { key: "data", type: "object", label: "The created submission" },
  ],

  execute(input, ctx) {
    if (input.formId === undefined && !input.formGuid) {
      throw new Error("submission-create needs a form id or a form GUID");
    }
    const responses = asOptionalJson<unknown[]>(input.responses, "responses");
    if (!Array.isArray(responses) || responses.length === 0) {
      throw new Error("responses must be a non-empty JSON array");
    }
    return new GoCanvasClient(ctx).request("/submissions", {
      method: "POST",
      body: compact({
        guid: input.guid || ctx.invocation?.invocationId || crypto.randomUUID(),
        department_id: input.departmentId,
        form: compact({ id: input.formId, guid: input.formGuid, version: input.formVersion }),
        responses,
        recipients: toList(input.recipients),
        next_assigned_workflow_user_id: input.assignToUserId,
        workflow: asOptionalJson(input.workflow, "workflow"),
      }),
    });
  },
};

export default submissionCreate;
