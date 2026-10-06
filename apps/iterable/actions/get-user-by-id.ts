import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `GET /api/users/byUserId` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-user-by-id",
  type: "read",
  resource: "user",
  title: "Get User by User ID",
  description: "Get a user profile by userId. Returns `user: null` when Iterable has no such user.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, hint: "The user's userId." },
  ],
  output: [
    { key: "user", type: "object", label: "The user profile (email, userId, dataFields), or null" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = str(p.userId);
    if (userId === undefined) throw new Error("`userId` is required");
    ctx.log("info", "Iterable Get User by User ID", { userId });
    const out = await call(ctx, "GET", "/users/byUserId", { query: { "userId": userId } });
    return { user: out.user ?? null };
  },
};

export default action;
