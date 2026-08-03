import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput } from "../lib/params.ts";

/**
 * `DELETE /community_members/{id}` — Circle's own summary for this route is
 * **"Deactivate a community member"**, not "delete", and the wording is the
 * whole reason this action exists separately from the two harsher ones.
 *
 * Circle offers three escalating ways to remove someone, on three different
 * routes, and they are not interchangeable:
 *
 *   | Route                                    | Circle's summary                | This app          |
 *   | ---------------------------------------- | ------------------------------- | ----------------- |
 *   | `DELETE /community_members/{id}`         | *Deactivate a community member* | this action       |
 *   | `PUT /community_members/{id}/delete_member` | *(delete)*                   | not shipped       |
 *   | `PUT /community_members/{id}/ban_member` | *Ban Community Member*          | `member-ban`      |
 *
 * The middle one is not shipped. Its route is a `PUT` on a path segment called
 * `delete_member`, its schema documents no parameters, and Circle's docs say
 * nothing about what it destroys or whether it can be undone — a permanently
 * destructive operation whose blast radius is undocumented is not something to
 * ship on an inference. `member-ban`, whose effects Circle *does* spell out,
 * covers the case where content really must go.
 *
 * Idempotent: deactivating an already-deactivated member converges rather than
 * compounding.
 */
interface Input {
  memberId: number;
}

const memberDeactivate: ActionDefinition<Input> = {
  key: "member-deactivate",
  type: "perform",
  resource: "member",
  title: "Deactivate Member",
  description:
    "Deactivate a community member. Circle names this route 'deactivate' — their posts and " +
    "comments stay. Use `member-ban` to remove content as well.",
  idempotent: true,
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "number",
      required: true,
      hint: "The community-member `id`, not `user_id`.",
      validation: { integer: true },
    },
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(
      `/community_members/${encodeURIComponent(String(input.memberId))}`,
      { method: "DELETE" },
    );
  },
};

export default memberDeactivate;
