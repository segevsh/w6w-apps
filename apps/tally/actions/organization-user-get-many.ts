import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

interface Input {
  organizationId: string;
}

/**
 * GET /organizations/{organizationId}/users — the organization's members.
 *
 * Unpaginated: a bare JSON array of `User`. Get the organization id from Get
 * Current User.
 */
const organizationUserGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "organization-user-get-many",
  type: "search",
  resource: "organization-user",
  title: "Get Many Organization Users",
  description: "List the members of an organization. Not paginated.",
  params: [organizationIdParam],
  output: [
    { key: "items", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Number of users" },
  ],

  async execute(input, ctx) {
    const users = await new TallyClient(ctx).request<unknown[]>(
      `/organizations/${encodeURIComponent(input.organizationId)}/users`,
    );
    const items = Array.isArray(users) ? users : [];
    return { items, count: items.length };
  },
};

export default organizationUserGetMany;
