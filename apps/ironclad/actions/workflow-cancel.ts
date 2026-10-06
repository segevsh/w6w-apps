import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, IroncladClient } from "../lib/client.ts";
import { stateChangeParams } from "../lib/params.ts";

interface Input {
  workflowId: string;
  message: string;
  addUsersToWorkflow?: boolean;
}

const workflowCancel: ActionDefinition<Input> = {
  key: "workflow-cancel",
  type: "perform",
  resource: "workflow",
  title: "Cancel Workflow",
  description: "Cancel a workflow. Cancellation cannot be undone; Ironclad requires a comment.",
  idempotent: false,
  params: stateChangeParams,
  output: [{ key: "workflowId", type: "string", label: "Workflow ID" }, {
    key: "cancelled",
    type: "boolean",
    label: "Whether the change was accepted",
  }],

  async execute(input, ctx) {
    await new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/cancel`, {
      method: "POST",
      body: {
        comment: compact({ message: input.message, addUsersToWorkflow: input.addUsersToWorkflow }),
      },
    });
    // Ironclad answers 204 with no body.
    return { workflowId: input.workflowId, cancelled: true };
  },
};

export default workflowCancel;
