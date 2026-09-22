import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, limitParam, offsetParam, paginationField, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/stickers/search` — search GIPHY's sticker library for a phrase.
 *
 * The sticker counterpart of `search-gifs`: same envelope, same 50-character
 * query cap, but a separate collection, so the same phrase can legitimately
 * return different media from each.
 *
 * There is no `lang` parameter here — GIPHY documents it on the GIF search
 * endpoint only.
 */
interface Input {
  q: string;
  limit?: number;
  offset?: number;
  rating?: string;
}

const searchStickers: ActionDefinition<Input> = {
  key: "search-stickers",
  type: "search",
  title: "Search Stickers",
  description:
    "Search GIPHY's sticker library for a phrase. Returns matching stickers plus GIPHY's " +
    "pagination object.",
  resource: "sticker",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "thumbs up",
      validation: { maxLength: 50 },
      hint:
        "Plain text — do not URL-encode it. GIPHY documents 414 URI Too Long for a query over " +
        "50 characters, so the limit is enforced here too.",
    },
    limitParam(25),
    offsetParam,
    ratingParam,
  ],
  output: [
    { key: "data", type: "array", label: "Matching stickers" },
    ...gifFields("data[]"),
    paginationField(),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown[]>("/stickers/search", {
      query: {
        q: input.q,
        limit: input.limit,
        offset: input.offset,
        rating: input.rating,
      },
    });
    return { data: body.data ?? [], pagination: body.pagination };
  },
};

export default searchStickers;
