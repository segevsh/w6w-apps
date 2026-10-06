import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

const linkGet: ActionDefinition<Input> = {
  key: "link-get",
  type: "read",
  resource: "link",
  title: "Get Scheduling Link",
  description: "Fetch one scheduling link by ID.",
  params: [{ key: "linkId", label: "Link ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Link ID" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/links/${encodeId(input.linkId)}`);
  },
};

export default linkGet;
