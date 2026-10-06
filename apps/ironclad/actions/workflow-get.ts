import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { hydrateEntitiesParam, workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: string;
  hydrateEntities?: boolean;
}

const workflowGet: ActionDefinition<Input> = {
  key: "workflow-get",
  type: "read",
  resource: "workflow",
  title: "Get Workflow",
  description:
    "Fetch one workflow: its step, status, launch attributes, roles, approvals and signatures.",
  params: [workflowIdParam, hydrateEntitiesParam],
  output: [
    { key: "id", type: "string", label: "Workflow ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "step", type: "string", label: "Current step" },
    { key: "status", type: "string", label: "Status" },
    { key: "attributes", type: "object", label: "Attributes" },
  ],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/workflows/${encodeId(input.workflowId)}`, {
      query: { hydrateEntities: input.hydrateEntities ? true : undefined },
    });
  },
};

export default workflowGet;
