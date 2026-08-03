import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput } from "../lib/params.ts";

/**
 * `DELETE /tagged_members?user_email=&member_tag_id=` — remove one tag from one
 * member.
 *
 * Query parameters, not a body — the mirror image of `tagged-member-add`, which
 * posts JSON. This App's three delete-by-identity routes each do it differently
 * (`space_members` and this one use the query string, `event_attendees` uses a
 * body), and each is transcribed from its own definition rather than from the
 * pattern next door.
 *
 * The tag itself is untouched; only this member's association with it goes.
 * Deleting the tag for everybody is `DELETE /member_tags/{id}`, which this App
 * does not ship — destroying a segmentation primitive that other workflows and
 * Circle's own paywall rules may depend on is not an operation to expose behind
 * a single numeric id.
 *
 * Idempotent: converges on "this member does not have this tag".
 */
interface Input {
  memberTagId: number;
  userEmail: string;
}

const taggedMemberRemove: ActionDefinition<Input> = {
  key: "tagged-member-remove",
  type: "perform",
  resource: "tagged-member",
  title: "Untag Member",
  description:
    "Remove one member tag from one member. The tag itself, and every other member holding it, " +
    "is untouched.",
  idempotent: true,
  params: [
    {
      key: "memberTagId",
      label: "Member tag ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
    {
      key: "userEmail",
      label: "Member email",
      type: "string",
      required: true,
      placeholder: "person@example.com",
    },
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/tagged_members", {
      method: "DELETE",
      // Query, not body — unlike the POST beside it.
      query: { member_tag_id: input.memberTagId, user_email: input.userEmail },
    });
  },
};

export default taggedMemberRemove;
