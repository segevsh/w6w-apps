import type { ActionDefinition } from "@w6w/types";
import { MandrillClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

const getUserInfo: ActionDefinition<Input> = {
  key: "get-user-info",
  type: "read",
  resource: "user",
  title: "Get User Info",
  description: "Return account info for the API-connected user (POST /users/info.json).",
  params: [],
  output: [
    { key: "username", type: "string", label: "Username" },
    { key: "reputation", type: "number", label: "Reputation" },
    { key: "hourly_quota", type: "number", label: "Hourly Quota" },
    { key: "backlog", type: "number", label: "Backlog" },
  ],

  execute(_input, ctx) {
    const client = new MandrillClient(ctx);
    return client.request("/users/info.json", {});
  },
};

export default getUserInfo;
