import type { ActionDefinition } from "@w6w/types";
import { SalesmsgClient } from "../lib/client.ts";

/**
 * `GET /organization/current` — "Get Current Organization" (scope `organizations:read`). Settings,
 * plan and credit fields of the caller's organization.
 */
type Input = Record<string, never>;

const organizationGet: ActionDefinition<Input> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Get the organization the token belongs to.",
  params: [],
  output: [{ key: "response", type: "object", label: "Organization" }],

  execute(_input, ctx) {
    return new SalesmsgClient(ctx).json("/organization/current");
  },
};

export default organizationGet;
