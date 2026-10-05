import type { ActionDefinition } from "@w6w/types";
import { assertUuid, BitwardenClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "group-delete",
  type: "perform",
  resource: "group",
  title: "Delete a group",
  description:
    "Delete a group. Its members stay in the organization. Empty 200 on success; 404 if unknown.",
  idempotent: true,
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when accepted" },
    { key: "id", type: "string", label: "The id deleted" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = assertUuid(p.groupId, "groupId");
    await new BitwardenClient(ctx).request(`/groups/${id}`, { method: "DELETE" });
    return { deleted: true, id };
  },
};

export default action;
