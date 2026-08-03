import type { ActionDefinition } from "@w6w/types";
import { CircleClient, compact, idList, jsonObject, unset } from "../lib/client.ts";
import { idListParam, memberOutput } from "../lib/params.ts";

/**
 * `POST /community_members` — add someone to the community.
 *
 * Circle's own summary is "Create/Invite a community member", and which of the
 * two it is depends on `skip_invitation`:
 *
 *   - default — Circle emails an invitation and the member confirms a profile.
 *     They exist immediately but count as `inactive` until they do (see
 *     `member-list`).
 *   - `skip_invitation: true` — the record is created silently. This is the
 *     migration path, and it is why `password` exists on this endpoint at all.
 *
 * ## Spaces and tags belong in this call
 *
 * `space_ids`, `space_group_ids` and `member_tag_ids` are accepted here, and
 * Circle asks for them to be used: "to add a member to multiple spaces or space
 * groups, you can pass a list of space_ids or space_group_ids in a single call
 * instead of making multiple requests". On a 5,000-request monthly allowance
 * that is not a style preference — onboarding one member into five spaces is
 * one request here versus six through `space-member-add`.
 *
 * ## What is not exposed
 *
 * `avatar` takes a `signed_id` from Circle's `POST /direct_uploads` flow, not a
 * URL. There is no way to turn an image URL into one from inside an action, so
 * offering the field would only produce 422s; a workflow that has a signed id
 * already can send it, but it is not a parameter a person can fill in.
 *
 * `password` is accepted by the endpoint and is deliberately **not** a param.
 * Setting another person's password from a workflow is a credential-handling
 * decision that does not belong in an integration action, and the value would
 * travel as ordinary action input rather than as a secret.
 *
 * Not idempotent: a second call with the same address is a duplicate-create,
 * which Circle answers 422. `member-search` first if a retry is possible.
 */
interface Input {
  email: string;
  name?: string;
  headline?: string;
  skipInvitation?: boolean;
  spaceIds?: string;
  spaceGroupIds?: string;
  memberTagIds?: string;
  profileFields?: unknown;
}

const memberInvite: ActionDefinition<Input> = {
  key: "member-invite",
  type: "perform",
  resource: "member",
  title: "Invite Member",
  description:
    "Create a community member by email, optionally adding them to spaces and tagging them in " +
    "the same call.",
  // A repeat call creates nothing — Circle rejects the duplicate address with a
  // 422 — but it is not a no-op either: the rejection still spends a metered
  // request, and the first call may have already sent an invitation email.
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "person@example.com",
      hint: "The only required field. Circle emails an invitation unless you skip it below.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "headline",
      label: "Headline",
      type: "string",
      hint: "The one-line role shown under their name.",
    },
    {
      key: "skipInvitation",
      label: "Skip invitation email",
      type: "boolean",
      hint: "Create the member without emailing them. The usual choice for a migration.",
    },
    idListParam(
      "spaceIds",
      "Space IDs",
      "Comma-separated space ids to add them to. One call beats one call per space.",
    ),
    idListParam(
      "spaceGroupIds",
      "Space group IDs",
      "Comma-separated space-group ids. Adds them to every space in each group.",
    ),
    idListParam("memberTagIds", "Member tag IDs", "Comma-separated tag ids to apply on creation."),
    {
      key: "profileFields",
      label: "Profile fields",
      type: "json",
      advanced: true,
      hint: 'Object of profile-field key → value, e.g. `{"company":"Acme"}`. The keys are ' +
        "the community's own `profile_field_key_*` names, visible on any member record.",
    },
  ],
  output: memberOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/community_members", {
      method: "POST",
      body: compact({
        email: input.email,
        name: unset(input.name),
        headline: unset(input.headline),
        // `compact` keeps `false`, but `false` is Circle's own default here and
        // sending it says nothing; only the affirmative is meaningful.
        skip_invitation: input.skipInvitation ? true : undefined,
        space_ids: idList(input.spaceIds),
        space_group_ids: idList(input.spaceGroupIds),
        member_tag_ids: idList(input.memberTagIds),
        community_member_profile_fields: jsonObject(input.profileFields, "Profile fields"),
      }),
    });
  },
};

export default memberInvite;
