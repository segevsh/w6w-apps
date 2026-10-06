import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  groupId: number;
  userId: number;
}

const groupMemberRemove: ActionDefinition<Input> = {
  key: "group-member-remove",
  type: "perform",
  resource: "group",
  title: "Remove Group Member",
  description: "Remove a member from a group by user id.",
  idempotent: true,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "number",
      "required": true,
      "validation": { "integer": true },
    },
    {
      "key": "userId",
      "label": "User ID",
      "type": "number",
      "required": true,
      "validation": { "integer": true },
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Uscreen accepted the request" },
  ],

  async execute(input, ctx) {
    await new UscreenClient(ctx).call(
      "DELETE",
      `/groups/${seg(input.groupId)}/members/${seg(input.userId)}`,
    );
    return { ok: true };
  },
};

export default groupMemberRemove;
