import type { ActionDefinition } from "@w6w/types";
import { call, compact, oneOf, str } from "../lib/client.ts";

/**
 * `POST /api/users/updateEmail` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "update-user-email",
  type: "perform",
  resource: "user",
  title: "Update User Email",
  description:
    "Change a user's email, migrating profile data and events. Email-based projects only; in userId-based or hybrid projects use Update User.",
  idempotent: true,
  params: [
    { key: "currentEmail", label: "Current Email", type: "string" },
    { key: "currentUserId", label: "Current User ID", type: "string" },
    { key: "newEmail", label: "New Email", type: "string", required: true },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const currentEmail = str(p.currentEmail);
    const currentUserId = str(p.currentUserId);
    const newEmail = str(p.newEmail);
    oneOf(["currentEmail", "currentUserId"], {
      "currentEmail": currentEmail,
      "currentUserId": currentUserId,
    }, "exactly-one");
    if (newEmail === undefined) throw new Error("`newEmail` is required");
    ctx.log("info", "Iterable Update User Email", { newEmail });
    const out = await call(ctx, "POST", "/users/updateEmail", {
      body: compact({
        "currentEmail": currentEmail,
        "currentUserId": currentUserId,
        "newEmail": newEmail,
      }),
    });
    return out;
  },
};

export default action;
