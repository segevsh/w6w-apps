import type { ActionDefinition } from "@w6w/types";
import { CircleClient, compact, idList, jsonObject, unset } from "../lib/client.ts";
import { idListParam, memberOutput } from "../lib/params.ts";

/**
 * `PUT /community_members/{id}` — edit a member's profile and memberships.
 *
 * ## The association fields REPLACE, they do not append
 *
 * `space_ids`, `space_group_ids` and `member_tag_ids` are the same parameters
 * the create endpoint takes, and on an update they set the member's full list
 * rather than adding to it. Sending one space id therefore *removes* them from
 * every other space. That is a destructive edit dressed as an additive one, and
 * it is the mistake this action is most likely to be used to make, so each hint
 * says so out loud and the field is left blank by default.
 *
 * For the additive operation — put this member in this one space, leave the
 * rest alone — use `space-member-add`, which is a different endpoint precisely
 * because it means something different.
 *
 * `lib/client.ts#idList` returns `undefined` rather than `[]` for a field
 * containing no usable number, which keeps a user who typed a stray comma from
 * clearing every association they have.
 *
 * ## `email` is not here
 *
 * The update schema has no `email` property — only create does. A member's
 * address is their identity in Circle and cannot be changed through this route.
 *
 * Idempotent: the endpoint sets the fields it is given to the values it is
 * given, so replaying the same call converges on the same record.
 */
interface Input {
  memberId: number;
  name?: string;
  headline?: string;
  spaceIds?: string;
  spaceGroupIds?: string;
  memberTagIds?: string;
  profileFields?: unknown;
}

const memberUpdate: ActionDefinition<Input> = {
  key: "member-update",
  type: "perform",
  resource: "member",
  title: "Update Member",
  description: "Edit a member's profile fields, spaces or tags. Association lists REPLACE.",
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
    { key: "name", label: "Name", type: "string" },
    { key: "headline", label: "Headline", type: "string" },
    idListParam(
      "spaceIds",
      "Space IDs",
      "REPLACES the member's space list — any space not listed is left. Leave blank to keep " +
        "their spaces as they are; use `space-member-add` to add one without touching the rest.",
    ),
    idListParam(
      "spaceGroupIds",
      "Space group IDs",
      "REPLACES the member's space-group list. Leave blank to keep it unchanged.",
    ),
    idListParam(
      "memberTagIds",
      "Member tag IDs",
      "REPLACES the member's tags. Leave blank to keep them; use `tagged-member-add` to add one.",
    ),
    {
      key: "profileFields",
      label: "Profile fields",
      type: "json",
      advanced: true,
      hint: "Object of profile-field key → value. Only the keys you send are touched.",
    },
  ],
  output: memberOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(
      `/community_members/${encodeURIComponent(String(input.memberId))}`,
      {
        method: "PUT",
        body: compact({
          name: unset(input.name),
          headline: unset(input.headline),
          space_ids: idList(input.spaceIds),
          space_group_ids: idList(input.spaceGroupIds),
          member_tag_ids: idList(input.memberTagIds),
          community_member_profile_fields: jsonObject(input.profileFields, "Profile fields"),
        }),
      },
    );
  },
};

export default memberUpdate;
