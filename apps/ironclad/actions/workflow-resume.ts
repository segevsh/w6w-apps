import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, IroncladClient } from "../lib/client.ts";
import { stateChangeParams } from "../lib/params.ts";

interface Input {
  workflowId: string;
  message: string;
  addUsersToWorkflow?: boolean;
}

const workflowResume: ActionDefinition<Input> = {
  key: "workflow-resume",
  type: "perform",
  resource: "workflow",
  title: "Resume Workflow",
  description: "Resume a paused workflow. Ironclad requires a comment.",
  idempotent: false,
  params: stateChangeParams,
  output: [{ key: "workflowId", type: "string", label: "Workflow ID" }, {
    key: "resumed",
    type: "boolean",
    label: "Whether the change was accepted",
  }],

  async execute(input, ctx) {
    await new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/resume`, {
      method: "POST",
      body: {
        comment: compact({ message: input.message, addUsersToWorkflow: input.addUsersToWorkflow }),
      },
    });
    // Ironclad answers 204 with no body.
    return { workflowId: input.workflowId, resumed: true };
  },
};

export default workflowResume;
