import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

const action: ActionDefinition = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get user",
  description: "Retrieve a single user by ID.",
  params: [USER_ID_PARAM],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email_addresses", type: "array", label: "Email addresses" },
    { key: "banned", type: "boolean", label: "Banned" },
    { key: "created_at", type: "number", label: "Created at (unix ms)" },
  ],

  async execute(input, ctx) {
    const userId = String((input as Record<string, unknown>).userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    return await new ClerkClient(ctx).request(`/users/${encodeURIComponent(userId)}`);
  },
};
export default action;
