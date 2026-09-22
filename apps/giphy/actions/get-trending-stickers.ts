import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, limitParam, offsetParam, paginationField, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/stickers/trending` — the stickers GIPHY is currently promoting.
 *
 * The sticker counterpart of `get-trending-gifs`, and equally parameter-free.
 */
interface Input {
  limit?: number;
  offset?: number;
  rating?: string;
}

const getTrendingStickers: ActionDefinition<Input> = {
  key: "get-trending-stickers",
  type: "read",
  title: "Get Trending Stickers",
  description:
    "List the stickers GIPHY is currently trending, with GIPHY's pagination object. Needs no " +
    "parameters.",
  resource: "sticker",
  params: [limitParam(), offsetParam, ratingParam],
  output: [
    { key: "data", type: "array", label: "Trending stickers" },
    ...gifFields("data[]"),
    paginationField(),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown[]>("/stickers/trending", {
      query: { limit: input.limit, offset: input.offset, rating: input.rating },
    });
    return { data: body.data ?? [], pagination: body.pagination };
  },
};

export default getTrendingStickers;
