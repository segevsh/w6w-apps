import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

const linkDelete: ActionDefinition<Input> = {
  key: "link-delete",
  type: "perform",
  resource: "link",
  title: "Delete Link",
  description: "Delete a shareable link; it stops working immediately.",
  idempotent: true,
  params: [{ key: "linkId", label: "Link ID", type: "string", required: true }],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    await new EgnyteClient(ctx).request(`/v1/links/${encodeURIComponent(input.linkId)}`, {
      method: "DELETE",
    });
    return { success: true };
  },
};

export default linkDelete;
