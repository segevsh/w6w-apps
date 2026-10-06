import type { ActionDefinition } from "@w6w/types";
import { idOf, PardotClient } from "../lib/client.ts";

const listMembershipDelete: ActionDefinition<{ listMembershipId: number }> = {
  key: "list-membership-delete",
  type: "perform",
  resource: "list-membership",
  title: "Remove Prospect from List",
  description:
    "Delete a list membership by its own id (find it with List List Memberships). The prospect and the list are untouched.",
  idempotent: true,
  params: [{
    key: "listMembershipId",
    label: "List membership ID",
    type: "number",
    required: true,
  }],
  output: [
    { key: "id", type: "number", label: "List membership ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = idOf(input.listMembershipId, "listMembershipId");
    await new PardotClient(ctx).request(`/list-memberships/${id}`, { method: "DELETE" });
    return { id, deleted: true };
  },
};

export default listMembershipDelete;
