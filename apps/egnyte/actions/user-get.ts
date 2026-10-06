import type { ActionDefinition } from "@w6w/types";
import { EgnyteClient } from "../lib/client.ts";

interface Input {
  userId: number;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch one user by the numeric ID Egnyte assigned.",
  params: [{ key: "userId", label: "User ID", type: "number", required: true }],
  output: [
    { key: "id", type: "number", label: "User ID" },
    { key: "userName", type: "string", label: "Username" },
    { key: "email", type: "string", label: "Email" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "userType", type: "string", label: "User type" },
  ],

  execute(input, ctx) {
    return new EgnyteClient(ctx).request(`/v2/users/${input.userId}`);
  },
};

export default userGet;
