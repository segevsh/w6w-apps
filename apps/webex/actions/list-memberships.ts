import type { ActionDefinition } from "@w6w/types";
import { unset, WebexClient } from "../lib/client.ts";

interface Input {
  roomId?: string;
  personId?: string;
  personEmail?: string;
  max?: number;
}

const listMemberships: ActionDefinition<Input> = {
  key: "list-memberships",
  type: "read",
  resource: "membership",
  title: "List Memberships",
  description: "List room memberships, filtered by room and/or person.",
  params: [
    { key: "roomId", label: "Room ID", type: "string" },
    {
      key: "personId",
      label: "Person ID",
      type: "string",
      hint: "Requires Room ID unless listing the connected user's own memberships.",
    },
    { key: "personEmail", label: "Person email", type: "string" },
    {
      key: "max",
      label: "Max results",
      type: "number",
      default: 50,
      validation: { min: 1, integer: true },
    },
  ],
  output: [
    { key: "id", type: "string", label: "Membership ID" },
    { key: "roomId", type: "string", label: "Room ID" },
    { key: "personId", type: "string", label: "Person ID" },
    { key: "isModerator", type: "boolean", label: "Moderator" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: unknown[] }>("/memberships", {
      query: {
        roomId: unset(input.roomId),
        personId: unset(input.personId),
        personEmail: unset(input.personEmail),
        max: input.max,
      },
    });
    return res.items ?? [];
  },
};

export default listMemberships;
