import type { ActionDefinition } from "@w6w/types";
import { compact, WorkOSClient } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /user_management/users` — the people who can sign in.
 *
 * ## A User is not a Directory User
 *
 * The two are easy to confuse and they mean different things:
 *
 *   - a **Directory User** is a record the customer's own system pushed at
 *     WorkOS, describing somebody who works there;
 *   - a **User** here is an identity in *your* product that can authenticate.
 *
 * They are linked when the person signs in, not when the directory syncs. So a
 * customer can have five hundred directory users and three users, which is
 * correct and means four hundred and ninety-seven of their staff have never
 * logged in.
 *
 * ## `email_verified` decides whether they can get in
 *
 * A user created by API starts unverified unless told otherwise, and an
 * unverified user is blocked from password sign-in. That is the usual "I
 * created the account and they can't log in".
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description:
    "The identities that can authenticate — which is NOT the customer's directory. A directory " +
    "user who has never signed in has no user record at all.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      default: "",
      hint: "Exact match. The fastest way to turn an address into a user id.",
    },
    {
      key: "organizationId",
      label: "Organization ID",
      type: "string",
      default: "",
      hint: "Only users with a membership in this organization.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "count", type: "number", label: "Users returned" },
    { key: "after", type: "string", label: "Cursor, when more remain" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const want = p.returnAll === true ? Infinity : Math.max(1, Number(p.limit ?? 50));
    const { items, after } = await new WorkOSClient(ctx).requestAll(
      "/user_management/users",
      {
        query: compact({
          email: p.email,
          organization_id: p.organizationId,
        }) as Record<string, string>,
      },
      want,
    );
    ctx.log("info", "read WorkOS users", { count: items.length });
    return { users: items, count: items.length, after };
  },
};

export default action;
