import type { ActionDefinition } from "@w6w/types";
import { BitwardenClient } from "../lib/client.ts";
import { items, shapePolicy } from "../lib/shape.ts";

const action: ActionDefinition = {
  key: "policy-list",
  type: "read",
  resource: "policy",
  title: "List policies",
  description:
    "Every policy type with whether it is enabled and its per-type `data`. Names are added as `typeName`.",
  params: [],
  output: [
    { key: "policies", type: "array", label: "Policies, with typeName" },
    { key: "count", type: "number", label: "How many" },
    { key: "enabled", type: "array", label: "typeNames of enabled policies" },
  ],

  async execute(input, ctx) {
    void input;
    const policies = items(await new BitwardenClient(ctx).request("/policies")).map((x) =>
      shapePolicy(x)
    );
    return {
      policies,
      count: policies.length,
      enabled: policies.filter((x) => x.enabled).map((x) => x.typeName),
    };
  },
};

export default action;
