import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: string;
}

const workflowApprovalsList: ActionDefinition<Input> = {
  key: "workflow-approvals-list",
  type: "read",
  resource: "workflow",
  title: "List Workflow Approvals",
  description:
    "List a workflow's approval groups and each reviewer's status. Only triggered approvals appear; conditional ones that have not triggered are omitted.",
  params: [workflowIdParam],
  output: [{ key: "approvalGroups", type: "array", label: "Approval groups" }, {
    key: "workflowId",
    type: "string",
    label: "Workflow ID",
  }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/approvals`);
  },
};

export default workflowApprovalsList;
