import type { ActionDefinition } from "@w6w/types";
import { FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  onBehalfOf?: string;
}

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "user",
  title: "Get Authenticated User",
  description:
    "Get the user behind the API key and the workspace it belongs to. A cheap way to confirm a connection and to read the workspace's id and subdomain.",
  params: [
    ON_BEHALF_OF,
  ],
  output: [
    { key: "user", type: "object", label: "id, email, full_name" },
    { key: "workspace", type: "object", label: "id, name, subdomain" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).request("/me", { onBehalfOf: input.onBehalfOf });
  },
};

export default meGet;
