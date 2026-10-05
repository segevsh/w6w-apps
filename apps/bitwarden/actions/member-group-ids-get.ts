import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "member-group-ids-get",
  type: "read",
  resource: "member",
  title: "Get a member's group IDs",
  description: "The ids of the groups a member belongs to.",
  params: [
    { key: "memberId", label: "Member ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "groupIds", type: "array", label: "Group ids" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.memberId, "memberId");
    const ids = await new BitwardenClient(ctx).request<string[]>(`/members/${id}/group-ids`);
    const groupIds = Array.isArray(ids) ? ids : [];
    return { groupIds, count: groupIds.length };
  },
};

export default action;
