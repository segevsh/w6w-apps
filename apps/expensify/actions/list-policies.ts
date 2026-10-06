import type { ActionDefinition } from "@w6w/types";
import { compact, runJob } from "../lib/client.ts";

interface Input {
  adminOnly?: boolean;
  userEmail?: string;
}

/** `get` / `policyList` — the Policy list getter. */
const listPolicies: ActionDefinition<Input> = {
  key: "list-policies",
  type: "read",
  resource: "policy",
  title: "List Policies",
  description: "List the account's policies with name, ID, type, owner, role and currency.",
  params: [
    {
      key: "adminOnly",
      label: "Admin policies only",
      type: "boolean",
      hint: "Only policies the user administers.",
    },
    {
      key: "userEmail",
      label: "User email",
      type: "string",
      hint:
        "List another user's policies. You must have been granted third-party access by that user or domain.",
    },
  ],
  output: [
    {
      key: "policyList",
      type: "array",
      label: "Policies: id, name, type, role, owner, outputCurrency",
    },
    { key: "count", type: "number", label: "Number of policies" },
  ],

  async execute(input, ctx) {
    const res = await runJob(ctx, {
      type: "get",
      inputSettings: compact({
        type: "policyList",
        adminOnly: input.adminOnly,
        userEmail: input.userEmail,
      }),
    });
    const policyList = (res.policyList as unknown[] | undefined) ?? [];
    return { policyList, count: policyList.length };
  },
};

export default listPolicies;
