import type { ActionDefinition } from "@w6w/types";
import { asJson, compact, encodeId, IroncladClient } from "../lib/client.ts";
import { workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: string;
  updates: Array<{ action: string; path: string; value?: string }> | string;
  comment?: string;
}

const workflowAttributesUpdate: ActionDefinition<Input> = {
  key: "workflow-attributes-update",
  type: "perform",
  resource: "workflow",
  title: "Update Workflow Attributes",
  description:
    "Set or remove attribute values on a workflow. The workflow must be in the Review step. Form validation is enforced.",
  idempotent: true,
  params: [
    workflowIdParam,
    {
      key: "updates",
      label: "Updates",
      type: "json",
      required: true,
      hint:
        'A list of {"action": "set" | "remove", "path": "<attribute id>", "value": "<string>"}. ' +
        "`value` is omitted for remove.",
    },
    {
      key: "comment",
      label: "Comment",
      type: "text",
      hint: "Optional note for the activity feed.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Workflow ID" }, {
    key: "attributes",
    type: "object",
    label: "Attributes after the update",
  }],

  execute(input, ctx) {
    const updates = asJson<unknown[]>(input.updates, "updates");
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("updates must be a non-empty list");
    }
    return new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/attributes`, {
      method: "PATCH",
      body: compact({ updates, comment: input.comment }),
    });
  },
};

export default workflowAttributesUpdate;
