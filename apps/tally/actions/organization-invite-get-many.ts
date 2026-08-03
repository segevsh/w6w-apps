import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

interface Input {
  organizationId: string;
}

/**
 * GET /organizations/{organizationId}/invites — pending invitations.
 *
 * Unpaginated: a bare JSON array, each entry `{ id, organizationId, email,
 * createdAt, updatedAt }`.
 */
const organizationInviteGetMany: ActionDefinition<Input, Record<string, unknown>> = {
  key: "organization-invite-get-many",
  type: "search",
  resource: "organization-invite",
  title: "Get Many Organization Invites",
  description: "List an organization's pending invites. Not paginated.",
  params: [organizationIdParam],
  output: [
    { key: "items", type: "array", label: "Invites" },
    { key: "count", type: "number", label: "Number of invites" },
  ],

  async execute(input, ctx) {
    const invites = await new TallyClient(ctx).request<unknown[]>(
      `/organizations/${encodeURIComponent(input.organizationId)}/invites`,
    );
    const items = Array.isArray(invites) ? invites : [];
    return { items, count: items.length };
  },
};

export default organizationInviteGetMany;
