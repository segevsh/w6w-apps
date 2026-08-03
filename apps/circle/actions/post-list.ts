import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import {
  listOutput,
  pageParam,
  perPageParam,
  postSortOptions,
  postStatusOptions,
  spaceIdParam,
} from "../lib/params.ts";

/**
 * `GET /posts` — basic posts, community-wide or scoped.
 *
 * Circle's own summary is "List **Basic** Posts", and the word is load-bearing:
 * this route covers posts in `basic`-type spaces. Image posts, events and
 * course lessons are separate resources on separate routes
 * (`/spaces/{id}/images/posts`, `/events`, `/course_lessons`) and do not appear
 * here. A space filter pointed at an event space returns nothing rather than
 * erroring, which is a confusing silence worth knowing about in advance.
 *
 * `space_id` and `space_group_id` are both optional, so with neither the action
 * pages the whole community. That is the expensive call — it is the one most
 * worth narrowing, given Circle counts every request against a monthly
 * allowance and explicitly warns against "fetching entire datasets instead of
 * using filters or pagination".
 *
 * `search_text` is a substring filter on this listing, which is a different
 * thing from the `search` action: that one hits Circle's own search index
 * across members, comments, spaces and events, and ranks results.
 */
interface Input {
  spaceId?: number;
  spaceGroupId?: number;
  status?: string;
  searchText?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

const postList: ActionDefinition<Input> = {
  key: "post-list",
  type: "search",
  resource: "post",
  title: "List Posts",
  description:
    "Page through basic posts, optionally narrowed to a space, a space group, a status or a " +
    "text match.",
  params: [
    spaceIdParam(
      false,
      "Narrow to one space. Must be a Posts-type space — an event or course space returns " +
        "nothing rather than erroring.",
    ),
    {
      key: "spaceGroupId",
      label: "Space group ID",
      type: "number",
      hint: "Narrow to every space in one group. `space-group-list` returns the ids.",
      validation: { integer: true },
    },
    { key: "status", label: "Status", type: "select", options: postStatusOptions },
    {
      key: "searchText",
      label: "Search text",
      type: "string",
      hint: "Filters this listing. For ranked search across members, comments and events, use " +
        "the `search` action instead.",
    },
    { key: "sort", label: "Sort by", type: "select", options: postSortOptions },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/posts", {
      query: {
        space_id: input.spaceId,
        space_group_id: input.spaceGroupId,
        status: unset(input.status),
        search_text: unset(input.searchText),
        sort: unset(input.sort),
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default postList;
