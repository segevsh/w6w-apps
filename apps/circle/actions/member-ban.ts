import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput } from "../lib/params.ts";

/**
 * `PUT /community_members/{id}/ban_member` — the destructive one.
 *
 * Circle documents exactly what it does, and it is a great deal more than
 * revoking access. Quoted verbatim from the endpoint's description:
 *
 *   > Ban a community member and delete all associated records including posts,
 *   > comments, likes, and chat messages. This action also bans the member's IP
 *   > addresses and email.
 *
 * Three consequences worth stating before anyone wires this into a workflow:
 *
 *   - **It deletes content, not just access.** Every post and comment the
 *     member ever wrote goes with them. Threads other members replied to lose
 *     their opening post.
 *   - **The ban is by IP and email, not by account.** It is a block on the
 *     person, so the same address cannot simply be re-invited afterwards.
 *   - **Nothing in the API undoes it.** There is no unban route in the v2
 *     document — 71 paths, none of them a reversal of this one.
 *
 * That is why the description leads with the deletion rather than the ban, and
 * why `member-deactivate` exists beside it for the ordinary "remove their
 * access" case.
 *
 * The route is a `PUT` with no body — the member id in the path is the entire
 * input, and it is typed `integer` here (the sibling routes type the same id as
 * `string`; the path renders identically either way).
 *
 * Idempotent in the narrow sense that a second call cannot delete the content
 * twice. It is still marked `true` honestly: the endpoint converges on "this
 * member is banned", which is what retry safety means here.
 */
interface Input {
  memberId: number;
}

const memberBan: ActionDefinition<Input> = {
  key: "member-ban",
  type: "perform",
  resource: "member",
  title: "Ban Member",
  description:
    "DESTRUCTIVE — deletes the member's posts, comments, likes and chat messages, then bans " +
    "their email and IP addresses. There is no unban endpoint.",
  idempotent: true,
  params: [
    {
      key: "memberId",
      label: "Member ID",
      type: "number",
      required: true,
      hint: "The community-member `id`. This cannot be undone through the API — Circle publishes " +
        "no unban route.",
      validation: { integer: true },
    },
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(
      `/community_members/${encodeURIComponent(String(input.memberId))}/ban_member`,
      { method: "PUT" },
    );
  },
};

export default memberBan;
