import type { ActionDefinition } from "@w6w/types";
import { EventbriteClient } from "../lib/client.ts";

interface Input {
  organizationId: string;
  continuation?: string;
}

const action: ActionDefinition<Input> = {
  key: "list-organization-roles",
  type: "search",
  resource: "organization",
  title: "List Organization Roles",
  description: "List an organization's roles.",
  idempotent: true,
  params: [
    { key: "organizationId", label: "Organization ID", type: "string", required: true },
    { key: "continuation", label: "Continuation token", type: "string" },
  ],
  output: [
    { key: "roles", type: "array", label: "Roles" },
    { key: "pagination", type: "object", label: "Pagination" },
  ],

  execute(input, ctx) {
    const client = new EventbriteClient(ctx);
    return client.request(
      `/organizations/${encodeURIComponent(input.organizationId)}/roles/`,
      { query: { continuation: input.continuation } },
    );
  },
};

export default action;
