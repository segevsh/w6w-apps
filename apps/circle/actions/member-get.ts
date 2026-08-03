import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { memberOutput } from "../lib/params.ts";

/**
 * `GET /community_members/{id}` — one member by numeric id.
 *
 * The id is Circle's `community_member` id, which is **not** the `user_id` that
 * also appears on the record. Both are integers and both are returned, so the
 * wrong one produces a confident 404 rather than an error that explains itself;
 * the hint says which is which.
 *
 * If all you have is an email address, use `member-search` — Circle serves that
 * lookup from a different route rather than as a filter here.
 *
 * Circle's own advice about wasted requests applies directly to this action:
 * "A common issue for 400, 422 and 404 errors is a blank or missing param",
 * with `GET /api/admin/v2/community_members/undefined` as the worked example.
 * A 404 costs the community a metered request, so `memberId` is `required` and
 * validated as an integer rather than being allowed through as whatever an
 * upstream step produced.
 */
interface Input {
  memberId: number;
}

const memberGet: ActionDefinition<Input> = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get Member",
  description: "Fetch one community member by their community-member id.",
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "number",
      required: true,
      hint: "The `id` on a community-member record — not its `user_id`. Look one up by address " +
        "with `member-search`.",
      validation: { integer: true },
    },
  ],
  output: memberOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(
      `/community_members/${encodeURIComponent(String(input.memberId))}`,
    );
  },
};

export default memberGet;
