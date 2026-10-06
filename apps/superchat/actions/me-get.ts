import type { ActionDefinition } from "@w6w/types";
import { SuperchatClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** Return the user the API key belongs to and the workspace name. */
const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "account",
  title: "Get Current User",
  description: "Return the user the API key belongs to and the workspace name.",
  params: [],
  output: [
    { "key": "user", "type": "object", "label": "Current user" },
    { "key": "workspace", "type": "object", "label": "Workspace" },
  ],

  execute(_input, ctx) {
    return new SuperchatClient(ctx).request("/me");
  },
};

export default meGet;
