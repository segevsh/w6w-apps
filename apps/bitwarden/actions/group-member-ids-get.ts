import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "group-member-ids-get",
  type: "read",
  resource: "group",
  title: "Get a group's member IDs",
  description: "The organization-scoped member ids (`id`, not `userId`) of everyone in a group.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "memberIds", type: "array", label: "Member ids" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.groupId, "groupId");
    const ids = await new BitwardenClient(ctx).request<string[]>(`/groups/${id}/member-ids`);
    const memberIds = Array.isArray(ids) ? ids : [];
    return { memberIds, count: memberIds.length };
  },
};

export default action;
