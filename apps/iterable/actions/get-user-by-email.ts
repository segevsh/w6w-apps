import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `GET /api/users/getByEmail` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "get-user-by-email",
  type: "read",
  resource: "user",
  title: "Get User by Email",
  description:
    "Get a user profile by email address. Returns `user: null` when Iterable has no such user.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "The user's email address.",
    },
  ],
  output: [
    { key: "user", type: "object", label: "The user profile (email, userId, dataFields), or null" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = str(p.email);
    if (email === undefined) throw new Error("`email` is required");
    ctx.log("info", "Iterable Get User by Email", { email });
    const out = await call(ctx, "GET", "/users/getByEmail", { query: { "email": email } });
    return { user: out.user ?? null };
  },
};

export default action;
