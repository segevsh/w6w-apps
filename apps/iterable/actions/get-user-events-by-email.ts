import type { ActionDefinition } from "@w6w/types";
import { call, int, str } from "../lib/client.ts";

/**
 * `GET /api/events/{email}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-user-events-by-email",
  type: "read",
  resource: "event",
  title: "Get User Events by Email",
  description: "Recent events for a user, by email.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The user's email address.",
    },
    { key: "limit", label: "Limit", type: "number", hint: "Number of events (max 200)." },
  ],
  output: [
    { key: "events", type: "array", label: "The user's events" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = str(p.email);
    const limit = int("limit", p.limit);
    if (email === undefined) throw new Error("`email` is required");
    ctx.log("info", "Iterable Get User Events by Email", { email });
    const out = await call(ctx, "GET", `/events/${encodeURIComponent(String(email))}`, {
      query: { "limit": limit },
    });
    return out;
  },
};

export default action;
