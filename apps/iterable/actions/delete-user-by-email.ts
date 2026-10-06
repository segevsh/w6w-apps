import type { ActionDefinition } from "@w6w/types";
import { call, str } from "../lib/client.ts";

/**
 * `DELETE /api/users/{email}` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "delete-user-by-email",
  type: "perform",
  resource: "user",
  title: "Delete User by Email",
  description:
    "Asynchronously delete a user by email. Does not stop future data collection about them. Email-based and hybrid projects only.",
  idempotent: true,
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
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = str(p.email);
    if (email === undefined) throw new Error("`email` is required");
    ctx.log("info", "Iterable Delete User by Email", { email });
    const out = await call(ctx, "DELETE", `/users/${encodeURIComponent(String(email))}`);
    return out;
  },
};

export default action;
