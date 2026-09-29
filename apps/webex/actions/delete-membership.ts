import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  membershipId: string;
}

const deleteMembership: ActionDefinition<Input> = {
  key: "delete-membership",
  type: "perform",
  resource: "membership",
  title: "Remove Person from Room",
  description: "Delete a room membership, removing the person from the room.",
  idempotent: true,
  params: [
    { key: "membershipId", label: "Membership ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    await new WebexClient(ctx).request(`/memberships/${encodeURIComponent(input.membershipId)}`, {
      method: "DELETE",
    });
    return { deleted: true };
  },
};

export default deleteMembership;
