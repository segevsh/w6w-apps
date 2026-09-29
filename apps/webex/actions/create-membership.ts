import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  roomId: string;
  personId?: string;
  personEmail?: string;
  isModerator?: boolean;
}

const createMembership: ActionDefinition<Input> = {
  key: "create-membership",
  type: "perform",
  resource: "membership",
  title: "Add Person to Room",
  description: "Add a person to a room, by ID or email — set exactly one.",
  // Webex mints a new membership id per call and takes no request key.
  idempotent: false,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    { key: "personId", label: "Person ID", type: "string" },
    { key: "personEmail", label: "Person email", type: "string" },
    { key: "isModerator", label: "Moderator", type: "boolean" },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "personId", type: "string", label: "Person ID" },
  ],

  execute(input, ctx) {
    return new WebexClient(ctx).request("/memberships", {
      method: "POST",
      body: {
        roomId: input.roomId,
        personId: unset(input.personId),
        personEmail: unset(input.personEmail),
        isModerator: input.isModerator,
      },
    });
  },
};

export default createMembership;
