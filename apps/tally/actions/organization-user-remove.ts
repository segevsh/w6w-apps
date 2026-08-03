import type { ActionDefinition } from "@w6w/types";
import { TallyClient } from "../lib/client.ts";
import { organizationIdParam } from "../lib/params.ts";

interface Input {
  organizationId: string;
  userId: string;
}

/**
 * DELETE /organizations/{organizationId}/users/{userId} — remove a member.
 *
 * Responds 204, no body. Note the knock-on effect the vendor documents on its
 * API-keys page: a key belongs to a user, so removing that user takes their API
 * keys down with them.
 */
const organizationUserRemove: ActionDefinition<Input, Record<string, unknown>> = {
  key: "organization-user-remove",
  type: "perform",
  resource: "organization-user",
  title: "Remove Organization User",
  description:
    "Remove a member from an organization. Their API keys stop working along with their membership.",
  idempotent: true,
  params: [
    organizationIdParam,
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      hint: "Get IDs from Get Many Organization Users.",
    },
  ],
  output: [
    { key: "userId", type: "string", label: "Removed user ID" },
    { key: "removed", type: "boolean", label: "Removed" },
  ],

  async execute(input, ctx) {
    ctx.log("info", "removing Tally organization user", { userId: input.userId });
    await new TallyClient(ctx).request(
      `/organizations/${encodeURIComponent(input.organizationId)}/users/${
        encodeURIComponent(input.userId)
      }`,
      { method: "DELETE" },
    );
    return { userId: input.userId, removed: true };
  },
};

export default organizationUserRemove;
