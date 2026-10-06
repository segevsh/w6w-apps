import type { ActionDefinition } from "@w6w/types";
import { compact, requiredText, runJob } from "../lib/client.ts";

interface Input {
  policyName: string;
  plan?: "team" | "corporate";
}

/** `create` / `policy` — the Policy creator. */
const createPolicy: ActionDefinition<Input> = {
  key: "create-policy",
  type: "perform",
  resource: "policy",
  title: "Create Policy",
  description: "Create a policy (workspace). Defaults to the team plan.",
  idempotent: false,
  params: [
    { key: "policyName", label: "Policy name", type: "string", required: true },
    {
      key: "plan",
      label: "Plan",
      type: "select",
      options: [
        { value: "team", label: "Team" },
        { value: "corporate", label: "Corporate" },
      ],
      hint: "Defaults to team when omitted.",
    },
  ],
  output: [
    { key: "policyID", type: "string", label: "ID of the created policy" },
    { key: "policyName", type: "string", label: "Name of the created policy" },
  ],

  async execute(input, ctx) {
    const res = await runJob(ctx, {
      type: "create",
      inputSettings: compact({
        type: "policy",
        policyName: requiredText("policyName", input.policyName),
        plan: input.plan,
      }),
    });
    return { policyID: res.policyID, policyName: res.policyName };
  },
};

export default createPolicy;
