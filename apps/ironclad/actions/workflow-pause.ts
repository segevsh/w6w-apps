import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, IroncladClient } from "../lib/client.ts";
import { stateChangeParams } from "../lib/params.ts";

interface Input {
  workflowId: string;
  message: string;
  addUsersToWorkflow?: boolean;
}

const workflowPause: ActionDefinition<Input> = {
  key: "workflow-pause",
  type: "perform",
  resource: "workflow",
  title: "Pause Workflow",
  description: "Pause an active workflow. Ironclad requires a comment.",
  idempotent: false,
  params: stateChangeParams,
  output: [{ key: "workflowId", type: "string", label: "Workflow ID" }, {
    key: "paused",
    type: "boolean",
    label: "Whether the change was accepted",
  }],

  async execute(input, ctx) {
    await new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/pause`, {
      method: "POST",
      body: {
        comment: compact({ message: input.message, addUsersToWorkflow: input.addUsersToWorkflow }),
      },
    });
    // Ironclad answers 204 with no body.
    return { workflowId: input.workflowId, paused: true };
  },
};

export default workflowPause;
