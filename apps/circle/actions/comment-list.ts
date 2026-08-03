import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import { listOutput, pageParam, perPageParam, spaceIdParam } from "../lib/params.ts";

/**
 * `GET /comments` — comments, filtered by post, by space, or by text.
 *
 * Every filter is optional, including all three at once, so an unfiltered call
 * pages the community's entire comment history. That is rarely what anyone
 * means and it is the single most expensive listing this App offers, so the
 * space and post filters carry hints pointing at each other.
 *
 * Two things the parameter table settles that the endpoint name does not:
 *
 *  - **`space_id` and `post_id` are independent filters, not a hierarchy.**
 *    Either works alone. `post_id` is the one that answers "the discussion under
 *    this post"; `space_id` answers "everything said in this space".
 *  - **Replies come back flat.** Each `comment` record carries
 *    `parent_comment_id` and `replies_count`, and threading is reconstructed
 *    from those rather than from any nesting in the response.
 */
interface Input {
  postId?: number;
  spaceId?: number;
  searchText?: string;
  page?: number;
  perPage?: number;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description:
    "Page through comments, optionally narrowed to one post, one space, or a text match. " +
    "Replies are returned flat, keyed by `parent_comment_id`.",
  params: [
    {
      key: "postId",
      label: "Post ID",
      type: "number",
      hint: "The discussion under one post. Independent of the space filter — either works alone.",
      validation: { integer: true },
    },
    spaceIdParam(false, "Every comment in one space. Independent of the post filter."),
    { key: "searchText", label: "Search text", type: "string" },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/comments", {
      query: {
        post_id: input.postId,
        space_id: input.spaceId,
        search_text: unset(input.searchText),
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default commentList;
