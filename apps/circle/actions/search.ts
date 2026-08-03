import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import { listOutput, pageParam, perPageParam, searchTypeOptions } from "../lib/params.ts";

/**
 * `GET /advanced_search` — Circle's own search index, across everything.
 *
 * This is a different thing from the `search_text` filters on `post-list` and
 * `comment-list`. Those narrow one collection by substring; this hits the index
 * that backs Circle's in-product search and can return posts, comments,
 * members, spaces, course lessons, events and mentions from one query. When a
 * workflow needs "find whatever mentions X", this is the call; when it needs
 * "the posts in this space matching X", `post-list` is cheaper and more
 * predictable.
 *
 * ## `type` narrows the index, and `general` is the default
 *
 * The nine values are the endpoint's own enum. Narrowing matters more than it
 * looks: a `general` search returns heterogeneous records, so a workflow that
 * expects to read `records[].name` off every result will find members and
 * comments that have no such field. Picking a type makes the result shape
 * uniform.
 *
 * ## `filters` is passed through, not modelled
 *
 * The parameter is declared as an object with `space_ids`, `topic_ids` and
 * further nested arrays, and it is a query-string object rather than a body —
 * so the exact bracket encoding Circle expects for each sub-key is not
 * something the parameter table pins down. Rather than guess at a serialisation
 * and ship a filter that silently does nothing, this action does not expose the
 * parameter at all. `post-list` and `comment-list` both take a real `space_id`
 * filter if that is what is wanted.
 *
 * `mention_scope` is likewise omitted: it qualifies `type: "mentions"` only, and
 * its four values (`space`, `group_chat`, `thread`, `direct`) describe a
 * surface this App has no other actions for.
 */
interface Input {
  query: string;
  type?: string;
  page?: number;
  perPage?: number;
}

const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "search",
  title: "Search Community",
  description:
    "Query Circle's own search index across posts, comments, members, spaces, lessons and " +
    "events. Narrow by type for a uniform result shape.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "type",
      label: "Search",
      type: "select",
      options: searchTypeOptions,
      hint: "Circle defaults to everything, which returns records of mixed shape. Narrowing " +
        "makes every result the same kind of thing.",
    },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/advanced_search", {
      query: {
        query: input.query,
        type: unset(input.type),
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default search;
