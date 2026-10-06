import type { ActionDefinition } from "@w6w/types";
import { RingoverClient, seg } from "../lib/client.ts";
import { limitParam, offsetParam } from "../lib/params.ts";

interface Input {
  groupId: number;
  limitCount?: number;
  limitOffset?: number;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch one call group with its members, ring strategy and ring durations.",
  params: [
    {
      key: "groupId",
      label: "Group ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    limitParam(1000, "Member limit"),
    offsetParam,
  ],
  output: [
    { key: "group_id", type: "number", label: "Group ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "total_users_count", type: "number", label: "Members" },
    { key: "is_jumper", type: "boolean", label: "Free access" },
    { key: "users", type: "array", label: "Members (paged)" },
  ],

  execute(input, ctx) {
    return new RingoverClient(ctx).request("GET", `/groups/${seg(input.groupId)}`, {
      query: { limit_count: input.limitCount, limit_offset: input.limitOffset },
    });
  },
};

export default groupGet;
