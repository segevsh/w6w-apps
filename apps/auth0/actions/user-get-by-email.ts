import type { ActionDefinition } from "@w6w/types";
import { Auth0Client } from "../lib/client.ts";

/**
 * `GET /api/v2/users-by-email` — look a user up by address, consistently.
 *
 * The endpoint to reach for whenever a workflow has an email and needs the
 * Auth0 user *now*: it is **immediately consistent**, where the search endpoint
 * is not. Auth0's own guidance is to use this or `user-get` "when immediate
 * consistency is necessary", and specifically not to build an auth or
 * account-linking flow on search.
 *
 * **It returns an array, and more than one entry is normal.** The same address
 * can exist in several connections — a database signup and a Google login are
 * two users with the same email — so a workflow that takes `[0]` is picking one
 * arbitrarily. Which one is right depends on the connection, which is in each
 * result's `identities`.
 *
 * It only searches database and passwordless connections; enterprise
 * connections are not covered.
 */
const action: ActionDefinition = {
  key: "user-get-by-email",
  type: "read",
  resource: "user",
  title: "Get users by email",
  description:
    "Find users by email address, immediately consistent. Returns an ARRAY — the same address " +
    "in two connections is two users, and picking the first is picking arbitrarily.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      default: "",
      placeholder: "ada@example.com",
      hint: "Matched exactly, case-insensitively. Database and passwordless connections only — " +
        "not enterprise ones.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Matches" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    const users = await new Auth0Client(ctx).request<unknown[]>("/users-by-email", {
      query: { email, fields: String(p.fields ?? "") || undefined },
    });
    const list = Array.isArray(users) ? users : [];
    if (list.length > 1) {
      ctx.log("info", "this email exists in more than one Auth0 connection", {
        count: list.length,
      });
    }
    return { users: list, count: list.length };
  },
};

export default action;
