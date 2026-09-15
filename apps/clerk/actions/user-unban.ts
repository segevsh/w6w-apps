import type { ActionDefinition } from "@w6w/types";
import { ClerkClient } from "../lib/client.ts";
import { USER_ID_PARAM } from "../lib/params.ts";

const action: ActionDefinition = {
  key: "user-unban",
  type: "perform",
  resource: "user",
  title: "Unban user",
  description: "Remove the ban mark from a user, allowing them to sign in again.",
  idempotent: true,
  params: [USER_ID_PARAM],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "banned", type: "boolean", label: "Banned" },
  ],

  async execute(input, ctx) {
    const userId = String((input as Record<string, unknown>).userId ?? "").trim();
    if (!userId) throw new Error("`userId` is required");
    return await new ClerkClient(ctx).request(`/users/${encodeURIComponent(userId)}/unban`, {
      method: "POST",
    });
  },
};
export default action;
