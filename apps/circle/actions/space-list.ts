import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import { listOutput, pageParam, perPageParam, spaceSortOptions } from "../lib/params.ts";

/**
 * `GET /spaces` — every space in the community.
 *
 * This is the lookup table for the rest of the App: almost every other action
 * takes a `space_id`, always as an integer and never as a slug, and this is
 * where the integers come from. Circle's own docs make the same point about
 * caching it: "we recommend caching static datasets which don't change that
 * often; i.e. spaces or community members".
 *
 * The `sort` enum is Circle's, transcribed rather than guessed, and it shares
 * no values with the post-list one despite the identical parameter name —
 * `active` and `latest_profile_confirmed` mean nothing to a post listing, and
 * `latest` is not offered here.
 *
 * The response records carry `space_type`, which decides what a space can hold:
 * only a `basic` space takes posts, only an `event` space takes events. Passing
 * an event space to `post-create` is a 404 on the space rather than a helpful
 * error, so it is worth reading the type from here first.
 */
interface Input {
  sort?: string;
  page?: number;
  perPage?: number;
}

const spaceList: ActionDefinition<Input> = {
  key: "space-list",
  type: "search",
  resource: "space",
  title: "List Spaces",
  description:
    "Page through the community's spaces. The source of the numeric space ids every other " +
    "action needs.",
  params: [
    { key: "sort", label: "Sort by", type: "select", options: spaceSortOptions },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/spaces", {
      query: { sort: unset(input.sort), page: input.page, per_page: input.perPage },
    });
  },
};

export default spaceList;
