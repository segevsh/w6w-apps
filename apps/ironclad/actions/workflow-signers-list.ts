import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: string;
}

const workflowSignersList: ActionDefinition<Input> = {
  key: "workflow-signers-list",
  type: "read",
  resource: "workflow",
  title: "List Workflow Signers",
  description: "List the signers on a workflow and the status of their signatures.",
  params: [workflowIdParam],
  output: [{ key: "signers", type: "array", label: "Signers and their signature status" }, {
    key: "workflowId",
    type: "string",
    label: "Workflow ID",
  }],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}/signatures`);
  },
};

export default workflowSignersList;
