import type { ActionDefinition } from "@w6w/types";
import { KvCoreClient } from "../lib/client.ts";

interface Input {
  user_id: string;
}

/** `GET /v2/public/user/{user_id}` — a single user's full profile. */
const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a single user's profile by ID.",
  params: [
    { key: "user_id", label: "User ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "role", type: "string", label: "Role" },
    { key: "status", type: "number", label: "1 if active, 0 otherwise" },
  ],

  async execute(input, ctx) {
    return await new KvCoreClient(ctx).json(`/user/${encodeURIComponent(input.user_id)}`);
  },
};

export default userGet;
