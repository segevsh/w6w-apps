import type { ActionDefinition } from "@w6w/types";
import { ZendeskClient } from "../lib/client.ts";

const organizationGet: ActionDefinition<{ organizationId: number }> = {
  key: "organization-get",
  type: "read",
  resource: "organization",
  title: "Get Organization",
  description: "Fetch an organization by id.",
  params: [{ key: "organizationId", label: "Organization ID", type: "number", required: true }],
  output: [
    { key: "organization.id", type: "number", label: "Organization ID" },
    { key: "organization.name", type: "string", label: "Name" },
    { key: "organization.domain_names", type: "array", label: "Domains" },
  ],

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/organizations/${input.organizationId}.json`);
  },
};

export default organizationGet;
