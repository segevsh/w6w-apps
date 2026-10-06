import type { ActionDefinition } from "@w6w/types";
import { seg, UscreenClient } from "../lib/client.ts";

interface Input {
  groupId: number;
}

const groupDelete: ActionDefinition<Input> = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete Group",
  description: "Delete a group by id.",
  idempotent: true,
  params: [
    {
      "key": "groupId",
      "label": "Group ID",
      "type": "number",
      "required": true,
      "validation": { "integer": true },
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "True when Uscreen accepted the request" },
  ],

  async execute(input, ctx) {
    await new UscreenClient(ctx).call("DELETE", `/groups/${seg(input.groupId)}`);
    return { ok: true };
  },
};

export default groupDelete;
