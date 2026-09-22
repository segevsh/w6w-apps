import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/stickers/random` — one random sticker, optionally from a tag.
 *
 * Like `get-random-gif`, `data` is a single object rather than an array.
 */
interface Input {
  tag?: string;
  rating?: string;
}

const getRandomSticker: ActionDefinition<Input> = {
  key: "get-random-sticker",
  type: "read",
  title: "Get Random Sticker",
  description: "Fetch one random sticker, optionally restricted to a tag. Returns a single object.",
  resource: "sticker",
  params: [
    {
      key: "tag",
      label: "Tag",
      type: "string",
      advanced: true,
      placeholder: "hello",
      hint: "Restricts the random pick to stickers GIPHY tagged with this term. Unset, the pick " +
        "is drawn from the whole library.",
    },
    ratingParam,
  ],
  output: [
    { key: "data", type: "object", label: "A random sticker" },
    ...gifFields("data"),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown>("/stickers/random", {
      query: { tag: input.tag, rating: input.rating },
    });
    return { data: body.data };
  },
};

export default getRandomSticker;
