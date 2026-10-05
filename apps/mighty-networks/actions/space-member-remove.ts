import type { ActionDefinition } from "@w6w/types";
import { MightyClient, seg } from "../lib/client.ts";

/** `DELETE /spaces/{space_id}/members/{user_id}/` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  spaceId: number;
  userId: number;
}

const spaceMemberRemove: ActionDefinition<Input> = {
  key: "space-member-remove",
  type: "perform",
  resource: "space-member",
  title: "Remove Member from Space",
  description:
    "Remove a member from a space. Their other spaces and their Network membership are untouched.",
  idempotent: true,
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "userId",
      label: "User ID",
      type: "number",
      required: true,
      hint: "The member's user id.",
      validation: { integer: true, min: 1 },
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "True when the API accepted the request" },
  ],

  async execute(input, ctx) {
    await new MightyClient(ctx).request(
      `/spaces/${seg(input.spaceId)}/members/${seg(input.userId)}/`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default spaceMemberRemove;
