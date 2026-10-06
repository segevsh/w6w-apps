import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

const linkDelete: ActionDefinition<Input> = {
  key: "link-delete",
  type: "perform",
  resource: "link",
  title: "Delete Scheduling Link",
  description: "Delete a scheduling link. Returns the deleted link.",
  idempotent: false,
  params: [{ key: "linkId", label: "Link ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Deleted link ID" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/links/${encodeId(input.linkId)}`, { method: "DELETE" });
  },
};

export default linkDelete;
