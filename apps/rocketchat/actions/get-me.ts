import type { ActionDefinition } from "@w6w/types";
import { RocketChatClient } from "../lib/client.ts";

const getMe: ActionDefinition<Record<string, never>> = {
  key: "get-me",
  type: "read",
  resource: "user",
  title: "Get Me",
  description: "The connected user's own profile: ID, username, status, roles (`GET /me`).",
  params: [],
  output: [
    { key: "_id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "name", type: "string", label: "Display name" },
    { key: "status", type: "string", label: "Presence status" },
    { key: "roles", type: "array", label: "Roles" },
  ],

  execute(_input, ctx) {
    return new RocketChatClient(ctx).request("/me");
  },
};

export default getMe;
