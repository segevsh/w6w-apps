import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient, uuidList } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "group-member-ids-set",
  type: "perform",
  resource: "group",
  title: "Set a group's members",
  description:
    "REPLACE the full membership of a group with the given member ids. Anyone not listed is removed from the group. Empty 200 on success.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
    {
      key: "memberIds",
      label: "Member IDs",
      type: "text",
      required: true,
      default: "",
      hint:
        "Organization member ids (`id`, not `userId`), one per line or comma separated. The complete desired membership.",
    },
  ],
  output: [
    { key: "updated", type: "boolean", label: "True when accepted" },
    { key: "memberIds", type: "array", label: "The ids sent" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.groupId, "groupId");
    const memberIds = uuidList(p.memberIds, "memberIds");
    await new BitwardenClient(ctx).request(`/groups/${id}/member-ids`, {
      method: "PUT",
      body: { memberIds },
    });
    return { updated: true, memberIds, count: memberIds.length };
  },
};

export default action;
