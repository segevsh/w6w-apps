import type { ActionDefinition } from "@w6w/types";
import { ClerkClient, csv } from "../lib/client.ts";
import { LIST_PARAMS } from "../lib/params.ts";

/**
 * `GET /users` — answers a **bare JSON array**, newest first by default.
 *
 * Clerk's own docs recommend `starting_after` cursor pagination over a large `offset` for
 * anything beyond a page or two: an offset page has to walk and discard every row before it and
 * gets progressively slower, while a cursor page costs the same regardless of how deep it sits.
 * Cursor pagination only works with the default `created_at` ordering, so this action exposes
 * `offset` (simple, works with any order) rather than adding a cursor param most callers would
 * never need.
 *
 * The result is wrapped as `{ data }` rather than returned bare, so every list action in this app
 * has the same output shape regardless of which shape Clerk's own endpoint happens to answer with
 * — see [`lib/client.ts`](../lib/client.ts). `GET /users` carries no total; `user-count` is the
 * separate, cheap way to get one.
 */
const action: ActionDefinition = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List users",
  description: "List users, optionally filtered by email, phone, username, or a free-text query.",
  params: [
    {
      key: "emailAddress",
      label: "Email address(es)",
      type: "string",
      default: "",
      hint: "Comma-separated. Exact match only.",
    },
    {
      key: "query",
      label: "Search query",
      type: "string",
      default: "",
      hint: "Partial match across email, phone, username, web3 wallet, user ID, and name.",
    },
    {
      key: "banned",
      label: "Banned only / not banned",
      type: "boolean",
      hint: "Leave unset to return both banned and non-banned users.",
    },
    ...LIST_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Users" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const data = await new ClerkClient(ctx).requestArray("/users", {
      query: {
        email_address: csv(p.emailAddress),
        query: p.query as string | undefined,
        banned: typeof p.banned === "boolean" ? p.banned : undefined,
        limit: (p.limit as number | undefined) ?? 10,
        offset: (p.offset as number | undefined) ?? 0,
      },
    });
    return { data };
  },
};
export default action;
