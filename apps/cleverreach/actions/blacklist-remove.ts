import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient, pathId } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "blacklist-remove",
  type: "perform",
  resource: "blacklist",
  title: "Remove from the blacklist",
  description: "Delete an email address from the blacklist (`DELETE /v3/blacklist/{email}`).",
  idempotent: true,
  params: [
    { key: "email", label: "Email", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "result", type: "object", label: "CleverReach's response body" },
  ],

  async execute(input, ctx) {
    return {
      result: await new CleverReachClient(ctx).request(
        `/blacklist/${pathId(input.email, "email")}`,
        { method: "DELETE" },
      ),
    };
  },
};

export default action;
