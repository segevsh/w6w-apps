import type { ActionDefinition } from "@w6w/types";
import { OktaClient } from "../lib/client.ts";

const userListApps: ActionDefinition<{ userId: string }> = {
  key: "user-list-apps",
  type: "search",
  resource: "user",
  title: "List User's Apps",
  description: "List every app assigned to a user, directly or through group membership.",
  params: [
    { key: "userId", label: "User ID or login", type: "string", required: true },
  ],
  output: [{ key: "appLinks", type: "array", label: "App links" }],

  execute(input, ctx) {
    return new OktaClient(ctx).request(`/users/${encodeURIComponent(input.userId)}/appLinks`);
  },
};

export default userListApps;
