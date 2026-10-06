import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  workflowId: string;
}

const workflowRulesList: ActionDefinition<Input> = {
  key: "workflow-rules-list",
  type: "read",
  resource: "workflow",
  title: "List Workflow Rules",
  description:
    "The rules of one SavvyCal workflow (trigger type, offset and actions), returned under `rules`.",
  params: [{ key: "workflowId", label: "Workflow ID", type: "string", required: true }],
  output: [{ key: "rules", type: "array", label: "Rules" }],

  async execute(input, ctx) {
    const rules = await new SavvyCalClient(ctx).json<unknown[]>(
      `/workflows/${encodeId(input.workflowId)}/rules`,
    );
    return { rules: Array.isArray(rules) ? rules : [] };
  },
};

export default workflowRulesList;
