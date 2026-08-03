import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  perPageParam,
  spaceIdParam,
  spaceMemberStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /space_members?space_id=` — who is in a space.
 *
 * `space_id` is **required** here, which is what makes this a per-space roster
 * rather than a membership table you can scan. There is no "every membership in
 * the community" listing in v2; reconciling memberships across spaces means
 * `space-list` and then one call per space, and each of those calls is metered.
 *
 * The `status` enum reads the same as the community roster's — `active`,
 * `inactive`, `all` — but the **default is different**: Circle documents this
 * one as "Space member status. By default, it returns all members", against
 * `active` on `GET /community_members`. Two identically-spelled parameters with
 * opposite defaults is exactly the kind of thing that produces a count nobody
 * can reconcile, so both option lists say which default is theirs.
 *
 * Each record is a `space_member`, which nests the full `community_member`
 * alongside the membership fields (`access_type`, `moderator`,
 * `notification_type`) — so this answers "who is here and how" in one call.
 */
interface Input {
  spaceId: number;
  status?: string;
  page?: number;
  perPage?: number;
}

const spaceMemberList: ActionDefinition<Input> = {
  key: "space-member-list",
  type: "search",
  resource: "space-member",
  title: "List Space Members",
  description: "Page through the members of one space, with their membership settings.",
  params: [
    spaceIdParam(true),
    {
      key: "status",
      label: "Status",
      type: "select",
      options: spaceMemberStatusOptions,
      hint: "Circle defaults to `all` on this route — unlike `member-list`, which defaults to " +
        "`active`.",
    },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/space_members", {
      query: {
        space_id: input.spaceId,
        status: unset(input.status),
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default spaceMemberList;
