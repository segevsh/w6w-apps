import type { ActionDefinition } from "@w6w/types";
import { BreezyClient } from "../lib/client.ts";

/** `GET /user` — the token owner's profile. */
const userGet: ActionDefinition<Record<string, never>> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Read the profile of the user the access token belongs to.",
  params: [],
  output: [
    { key: "_id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email_address", type: "string", label: "Email" },
    { key: "username", type: "string", label: "Username" },
  ],

  execute(_input, ctx) {
    return new BreezyClient(ctx).request("GET", "/user");
  },
};

export default userGet;
