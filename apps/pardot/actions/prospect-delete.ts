import type { ActionDefinition } from "@w6w/types";
import { idOf, PardotClient } from "../lib/client.ts";
import { prospectIdParam } from "../lib/params.ts";

const prospectDelete: ActionDefinition<{ prospectId: number }> = {
  key: "prospect-delete",
  type: "perform",
  resource: "prospect",
  title: "Delete Prospect",
  description:
    "Delete a prospect. It moves to the Account Engagement recycle bin; related records are not deleted.",
  idempotent: true,
  params: [prospectIdParam],
  output: [
    { key: "id", type: "number", label: "Prospect ID" },
    { key: "deleted", type: "boolean", label: "Deleted" },
  ],

  async execute(input, ctx) {
    const id = idOf(input.prospectId, "prospectId");
    await new PardotClient(ctx).request(`/prospects/${id}`, { method: "DELETE" });
    return { id, deleted: true };
  },
};

export default prospectDelete;
