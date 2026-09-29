import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  membershipId: string;
}

const getMembership: ActionDefinition<Input> = {
  key: "get-membership",
  type: "read",
  resource: "membership",
  title: "Get Membership",
  description: "Get the details of a single room membership.",
  params: [
    { key: "membershipId", label: "Membership ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "roomId", type: "string", label: "Room ID" },
    { key: "isModerator", type: "boolean", label: "Moderator" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/memberships/${encodeURIComponent(input.membershipId)}`);
  },
};

export default getMembership;
