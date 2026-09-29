import type { ActionDefinition } from "@w6w/types";
import { WebexClient } from "../lib/client.ts";

interface Input {
  membershipId: string;
  isModerator: boolean;
  isRoomHidden: boolean;
}

const updateMembership: ActionDefinition<Input> = {
  key: "update-membership",
  type: "perform",
  resource: "membership",
  title: "Update Membership",
  description: "Update a room membership's moderator flag and hidden state. Webex requires both.",
  idempotent: true,
  params: [
    { key: "membershipId", label: "Membership ID", type: "string", required: true },
    { key: "isModerator", label: "Moderator", type: "boolean", required: true },
    {
      key: "isRoomHidden",
      label: "Hide direct room in client",
      type: "boolean",
      required: true,
      hint: "Only meaningful for a direct (1:1) room. A new message re-shows it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "isModerator", type: "boolean", label: "Moderator" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request(`/memberships/${encodeURIComponent(input.membershipId)}`, {
      method: "PUT",
      body: { isModerator: input.isModerator, isRoomHidden: input.isRoomHidden },
    });
  },
};

export default updateMembership;
