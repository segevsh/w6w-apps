import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `DELETE /api/users/byUserId/{userId}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "delete-user-by-id",
  type: "perform",
  resource: "user",
  title: "Delete User by User ID",
  description:
    "Asynchronously delete a user by userId (every user sharing that userId). Does not stop future data collection about them.",
  idempotent: true,
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, hint: "The user's userId." },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = str(p.userId);
    if (userId === undefined) throw new Error("`userId` is required");
    ctx.log("info", "Iterable Delete User by User ID", { userId });
    const out = await call(ctx, "DELETE", `/users/byUserId/${encodeURIComponent(String(userId))}`);
    return out;
  },
};

export default action;
