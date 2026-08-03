import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import { listOutput, pageParam, perPageParam } from "../lib/params.ts";

/**
 * `GET /space_groups` — the sidebar groups spaces are filed under.
 *
 * Shipped because `space-create` cannot work without it: `space_group_id` is
 * one of that endpoint's three required fields, and this is the only route in
 * v2 that returns the ids. Without it, creating a space from a workflow means
 * reading a number out of Circle's admin UI by hand.
 *
 * Space groups are also the coarse membership handle — `member-invite` and
 * `member-update` both take `space_group_ids`, which adds a member to every
 * space in the group at once, and a group can be configured to
 * `automatically_add_members_to_new_spaces`. So granting access by group rather
 * than by space is both fewer requests and less to maintain, and the
 * `spaces_count` on each record is how you tell how much a group grants.
 *
 * `name` is an exact-ish server-side filter, sent only when supplied — Circle
 * documents it as "Filter by name" with no wildcard syntax, so no glob is
 * synthesised here.
 */
interface Input {
  name?: string;
  page?: number;
  perPage?: number;
}

const spaceGroupList: ActionDefinition<Input> = {
  key: "space-group-list",
  type: "search",
  resource: "space-group",
  title: "List Space Groups",
  description:
    "Page through the community's space groups. The source of the `space_group_id` that " +
    "`space-create` requires.",
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      hint: "Server-side filter. Circle documents no wildcard syntax for it.",
    },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/space_groups", {
      query: { name: unset(input.name), page: input.page, per_page: input.perPage },
    });
  },
};

export default spaceGroupList;
