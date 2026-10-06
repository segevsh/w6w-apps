import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, IroncladClient } from "../lib/client.ts";
import { workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: string;
  roleId: string;
  status: "approved" | "pending";
  userEmail?: string;
}

const workflowApprovalUpdate: ActionDefinition<Input> = {
  key: "workflow-approval-update",
  type: "perform",
  resource: "workflow",
  title: "Update Workflow Approval",
  description:
    "Approve (or reset to pending) one approval role on a workflow. Only possible during the Review step and while that approval group is active.",
  idempotent: true,
  params: [
    workflowIdParam,
    {
      key: "roleId",
      label: "Role ID",
      type: "string",
      required: true,
      hint: "The approval role's id, from List Workflow Approvals (`reviewers[].role`).",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { value: "approved", label: "Approved" },
        { value: "pending", label: "Pending" },
      ],
    },
    {
      key: "userEmail",
      label: "On behalf of (email)",
      type: "string",
      hint: "Optional. The approver to record the change against.",
    },
  ],
  output: [
    { key: "updated", type: "boolean", label: "Whether Ironclad accepted the change" },
    { key: "workflowId", type: "string", label: "Workflow ID" },
    { key: "roleId", type: "string", label: "Role ID" },
    { key: "status", type: "string", label: "Status set" },
  ],

  async execute(input, ctx) {
    const result = await new IroncladClient(ctx).json<boolean>(
      `/workflows/${encodeId(input.workflowId)}/approvals/${encodeId(input.roleId)}`,
      {
        method: "PATCH",
        body: compact({
          status: input.status,
          user: input.userEmail ? { email: input.userEmail, type: "email" } : undefined,
        }),
      },
    );
    // Ironclad answers a bare JSON `true`.
    return {
      updated: result === true,
      workflowId: input.workflowId,
      roleId: input.roleId,
      status: input.status,
    };
  },
};

export default workflowApprovalUpdate;
