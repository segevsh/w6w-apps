import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient, uuidList } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "member-group-ids-set",
  type: "perform",
  resource: "member",
  title: "Set a member's groups",
  description:
    "REPLACE the full set of groups a member belongs to. Groups not listed are left. Empty 200 on success.",
  idempotent: true,
  params: [
    { key: "memberId", label: "Member ID", type: "string", required: true, default: "" },
    {
      key: "groupIds",
      label: "Group IDs",
      type: "text",
      required: true,
      default: "",
      hint: "The complete desired group list, one id per line or comma separated.",
    },
  ],
  output: [
    { key: "updated", type: "boolean", label: "True when accepted" },
    { key: "groupIds", type: "array", label: "The ids sent" },
    { key: "count", type: "number", label: "How many" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.memberId, "memberId");
    const groupIds = uuidList(p.groupIds, "groupIds");
    await new BitwardenClient(ctx).request(`/members/${id}/group-ids`, {
      method: "PUT",
      body: { groupIds },
    });
    return { updated: true, groupIds, count: groupIds.length };
  },
};

export default action;
