import type { ActionDefinition } from "@w6w/types";
import { ShortcutClient } from "../lib/client.ts";
import { workflowIdParam } from "../lib/params.ts";

interface Input {
  workflowId: number;
}

const workflowGet: ActionDefinition<Input> = {
  key: "workflow-get",
  type: "read",
  resource: "workflow",
  title: "Get Workflow",
  description: "Fetch one Workflow's full definition, including its states.",
  params: [workflowIdParam],
  output: [{ key: "data", type: "object", label: "The Workflow" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(`/workflows/${input.workflowId}`);
  },
};

export default workflowGet;
