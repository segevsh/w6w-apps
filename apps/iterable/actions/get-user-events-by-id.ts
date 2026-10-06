import type { ActionDefinition } from "@w6w/types";
import { call, int, str } from "../lib/client.ts";

/**
 * `GET /api/events/byUserId/{userId}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-user-events-by-id",
  type: "read",
  resource: "event",
  title: "Get User Events by User ID",
  description: "Recent events for a user, by userId.",
  params: [
    { key: "userId", label: "User ID", type: "string", required: true, hint: "The user's userId." },
    { key: "limit", label: "Limit", type: "number", hint: "Number of events (max 200)." },
  ],
  output: [
    { key: "events", type: "array", label: "The user's events" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const userId = str(p.userId);
    const limit = int("limit", p.limit);
    if (userId === undefined) throw new Error("`userId` is required");
    ctx.log("info", "Iterable Get User Events by User ID", { userId });
    const out = await call(ctx, "GET", `/events/byUserId/${encodeURIComponent(String(userId))}`, {
      query: { "limit": limit },
    });
    return out;
  },
};

export default action;
