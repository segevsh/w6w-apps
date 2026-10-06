import type { ActionDefinition } from "@w6w/types";
import { CleverReachClient } from "../lib/client.ts";

const action: ActionDefinition = {
  key: "whoami",
  type: "read",
  resource: "account",
  title: "Who am I",
  description:
    "Information about the CleverReach client (account) the token belongs to (`GET /v3/debug/whoami`). The response body is undocumented, so it is returned as sent.",
  params: [],
  output: [
    { key: "client", type: "object", label: "The client as returned" },
  ],

  async execute(_input, ctx) {
    return { client: await new CleverReachClient(ctx).request("/debug/whoami") };
  },
};

export default action;
