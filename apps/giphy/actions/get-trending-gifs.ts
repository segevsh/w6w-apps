import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, limitParam, offsetParam, paginationField, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/gifs/trending` — the GIFs GIPHY is currently promoting.
 *
 * No required parameters at all: this endpoint answers as-is, which is what
 * makes it the cheapest call on the surface and the one the connection's
 * liveness probe uses.
 *
 * `limit` is left unset so GIPHY's own default applies — unlike the search
 * endpoints, the documentation verified for this app states no explicit
 * default, so no number is invented here.
 */
interface Input {
  limit?: number;
  offset?: number;
  rating?: string;
}

const getTrendingGifs: ActionDefinition<Input> = {
  key: "get-trending-gifs",
  type: "read",
  title: "Get Trending GIFs",
  description:
    "List the GIFs GIPHY is currently trending, with GIPHY's pagination object. Needs no " +
    "parameters.",
  resource: "gif",
  params: [limitParam(), offsetParam, ratingParam],
  output: [
    { key: "data", type: "array", label: "Trending GIFs" },
    ...gifFields("data[]"),
    paginationField(),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown[]>("/gifs/trending", {
      query: { limit: input.limit, offset: input.offset, rating: input.rating },
    });
    return { data: body.data ?? [], pagination: body.pagination };
  },
};

export default getTrendingGifs;
