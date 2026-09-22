import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/gifs/random` — one random GIF, optionally from a tag.
 *
 * **This endpoint answers a single object, not an array.** GIPHY's list
 * endpoints put an array in `data`; the random and translate endpoints put one
 * `GifObject` there instead, so `data` is declared `object` here and the output
 * fields sit at `data.*` rather than `data[].*`. Reading this response as a
 * list is the fastest way to get nothing out of it.
 */
interface Input {
  tag?: string;
  rating?: string;
}

const getRandomGif: ActionDefinition<Input> = {
  key: "get-random-gif",
  type: "read",
  title: "Get Random GIF",
  description: "Fetch one random GIF, optionally restricted to a tag. Returns a single GIF object.",
  resource: "gif",
  params: [
    {
      key: "tag",
      label: "Tag",
      type: "string",
      advanced: true,
      placeholder: "celebrate",
      hint: "Restricts the random pick to GIFs GIPHY tagged with this term. Unset, the pick is " +
        "drawn from the whole library.",
    },
    ratingParam,
  ],
  output: [
    { key: "data", type: "object", label: "A random GIF" },
    ...gifFields("data"),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown>("/gifs/random", {
      query: { tag: input.tag, rating: input.rating },
    });
    return { data: body.data };
  },
};

export default getRandomGif;
