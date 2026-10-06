import type { ActionDefinition } from "@w6w/types";
import { encodeId, SavvyCalClient } from "../lib/client.ts";

interface Input {
  linkId: string;
}

const linkToggle: ActionDefinition<Input> = {
  key: "link-toggle",
  type: "perform",
  resource: "link",
  title: "Toggle Scheduling Link",
  description:
    "Flip a scheduling link between active and disabled. Not idempotent: calling it twice " +
    "restores the original state.",
  idempotent: false,
  params: [{ key: "linkId", label: "Link ID", type: "string", required: true }],
  output: [{ key: "state", type: "string", label: "New state" }],

  execute(input, ctx) {
    return new SavvyCalClient(ctx).json(`/links/${encodeId(input.linkId)}/toggle`, {
      method: "POST",
    });
  },
};

export default linkToggle;
