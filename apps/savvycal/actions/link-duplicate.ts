import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

const linkDuplicate: ActionDefinition<Input> = {
  key: "link-duplicate",
  type: "perform",
  resource: "link",
  title: "Duplicate Scheduling Link",
  description: "Create a copy of an existing scheduling link. Returns the new link.",
  idempotent: false,
  params: [{ key: "linkId", label: "Link ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "New link ID" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/links/${encodeId(input.linkId)}/duplicate`, {
      method: "POST",
    });
  },
};

export default linkDuplicate;
