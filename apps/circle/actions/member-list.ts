import type { ActionDefinition } from "@w6w/types";
import { CircleClient, idList, unset } from "../lib/client.ts";
import {
  idListParam,
  listOutput,
  memberStatusOptions,
  pageParam,
  perPageParam,
} from "../lib/params.ts";

/**
 * `GET /community_members` — the community roster.
 *
 * Two things this encodes from the parameter table:
 *
 *  - **`status` defaults to `active`, and `active` is narrower than it sounds.**
 *    Circle's own gloss: "`active`: members who have completed profile setup
 *    (`profile_confirmed_at` is set)". An invited member who never finished
 *    signing up is `inactive` and is *not* in the default result. A workflow
 *    reconciling an external list against Circle almost always wants `all`, so
 *    the option carries that explanation rather than leaving it to be
 *    discovered by a headcount that does not match.
 *  - **`member_tag_ids` is OR, not AND.** The parameter's description says so:
 *    "Filter by Member Tag IDs (OR logic, comma-separated)". Passing three tags
 *    widens the result; it does not narrow it to members holding all three.
 *
 * The tag filter is sent as a repeated `member_tag_ids[]`, which is how Rails
 * parses an array — a single comma-joined string would arrive as one value.
 */
interface Input {
  status?: string;
  memberTagIds?: string;
  page?: number;
  perPage?: number;
}

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List Members",
  description: "Page through the community roster, optionally filtered by status or member tags.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: memberStatusOptions,
      hint: "Circle defaults to `active`, which excludes members who never confirmed a profile.",
    },
    idListParam(
      "memberTagIds",
      "Member tag IDs",
      "Comma-separated tag ids. OR logic — a member holding any of them matches. " +
        "`member-tag-list` returns the ids.",
    ),
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/community_members", {
      query: {
        status: unset(input.status),
        member_tag_ids: idList(input.memberTagIds),
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default memberList;
