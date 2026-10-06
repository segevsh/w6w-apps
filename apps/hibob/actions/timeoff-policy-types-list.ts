import type { ActionDefinition } from "@w6w/types";
import { HibobClient } from "../lib/client.ts";

/** `GET /v1/timeoff/policy-types` — the names of all time off policy types. */
const timeoffPolicyTypesList: ActionDefinition<Record<string, never>> = {
  key: "timeoff-policy-types-list",
  type: "read",
  resource: "timeoff",
  title: "List Time Off Policy Types",
  description: "List the names of all time off policy types.",
  params: [],
  output: [{ key: "policyTypes", type: "object", label: "Policy type names" }],

  async execute(_input, ctx) {
    return await new HibobClient(ctx).get("/timeoff/policy-types");
  },
};

export default timeoffPolicyTypesList;
