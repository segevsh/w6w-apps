import type { ActionDefinition } from "@w6w/types";
import { MightyClient } from "../lib/client.ts";

/** `GET /me` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
type Input = Record<string, never>;

const meGet: ActionDefinition<Input> = {
  key: "me-get",
  type: "read",
  resource: "me",
  title: "Get Token Identity",
  description:
    "Return the user and Network the API token belongs to. A cheap way to confirm the connection works.",
  output: [
    { key: "user", type: "object", label: "The user the token belongs to" },
    { key: "network", type: "object", label: "The Network the token belongs to" },
  ],

  execute(_input, ctx) {
    return new MightyClient(ctx).request("/me");
  },
};

export default meGet;
