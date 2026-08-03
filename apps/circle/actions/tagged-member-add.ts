import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { taggedMemberOutput } from "../lib/params.ts";

/**
 * `POST /tagged_members` — apply one tag to one member.
 *
 * ## Additive, where the member update is destructive
 *
 * This adds a tag and leaves the member's other tags alone. `member-update`'s
 * `member_tag_ids` **replaces** the member's whole tag list — so the obvious
 * "just set the tags" route is the one that silently strips segmentation
 * someone else's workflow relies on. That is why this endpoint exists and why
 * this action points at the difference.
 *
 * ## Keyed by email and tag id — one of each
 *
 * `{ member_tag_id, user_email }`, both required. Note the mixed keying: the
 * tag by numeric id, the member by address. That is Circle's pattern across the
 * membership routes and is not a transcription slip.
 *
 * There is no bulk form. Tagging one member with three tags is three requests
 * here, or one `member-update` — but only if replacing the full list is what
 * you meant. Given Circle's monthly metering, that trade-off is worth making
 * consciously rather than by habit.
 *
 * Idempotent: applying a tag the member already has converges rather than
 * duplicating it.
 */
interface Input {
  memberTagId: number;
  userEmail: string;
}

const taggedMemberAdd: ActionDefinition<Input> = {
  key: "tagged-member-add",
  type: "perform",
  resource: "tagged-member",
  title: "Tag Member",
  description:
    "Apply one member tag to one member. Additive — unlike `member-update`, which replaces the " +
    "member's whole tag list.",
  idempotent: true,
  params: [
    {
      key: "memberTagId",
      label: "Member tag ID",
      type: "number",
      required: true,
      hint: "`member-tag-list` returns the ids.",
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
  output: taggedMemberOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/tagged_members", {
      method: "POST",
      body: { member_tag_id: input.memberTagId, user_email: input.userEmail },
    });
  },
};

export default taggedMemberAdd;
