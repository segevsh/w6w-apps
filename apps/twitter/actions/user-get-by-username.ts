import type { ActionDefinition } from "@w6w/types";
import { TwitterClient } from "../lib/client.ts";

interface Input {
  username: string;
}

interface UserResponse {
  data: { id: string; username: string; name: string };
}

/**
 * `GET /2/users/by/username/:username` (tweet.read + users.read). Billed per
 * user read under X's pay-per-use pricing — see README.
 */
const userGetByUsername: ActionDefinition<Input, UserResponse["data"]> = {
  key: "user-get-by-username",
  type: "read",
  resource: "user",
  title: "Get User by Username",
  description: "Look up a user by their @handle.",
  params: [
    {
      key: "username",
      label: "Username",
      type: "string",
      required: true,
      placeholder: "n8n_io",
      hint: "Without the leading @.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "name", type: "string", label: "Display name" },
  ],

  async execute(input, ctx) {
    const username = input.username.replace(/^@/, "");
    const res = await new TwitterClient(ctx).request<UserResponse>(
      `/users/by/username/${encodeURIComponent(username)}`,
    );
    return res.data;
  },
};

export default userGetByUsername;
