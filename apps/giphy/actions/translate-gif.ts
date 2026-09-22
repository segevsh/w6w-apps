import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, ratingParam, weirdnessParam } from "../lib/params.ts";

/**
 * `GET /v1/gifs/translate` — turn a phrase into the single best GIF for it.
 *
 * `s` is the phrase, and it is the whole point: GIPHY maps it to one
 * `GifObject`, not a list, so `data` is declared `object` and the output fields
 * sit at `data.*`.
 *
 * The response carries an `analytics` object as well as the GIF. This app does
 * not expose it — the verified documentation states that the field exists but
 * not what is in it, and guessing at an analytics shape is exactly the kind of
 * inference this app avoids.
 */
interface Input {
  s: string;
  rating?: string;
  weirdness?: number;
}

const translateGif: ActionDefinition<Input> = {
  key: "translate-gif",
  type: "read",
  title: "Translate to GIF",
  description:
    "Translate a phrase into the single GIF GIPHY thinks best matches it. Returns one GIF object.",
  resource: "gif",
  params: [
    {
      key: "s",
      label: "Phrase",
      type: "string",
      required: true,
      placeholder: "excited about shipping",
      hint: "The phrase to translate. Plain text — do not URL-encode it.",
    },
    ratingParam,
    weirdnessParam,
  ],
  output: [
    { key: "data", type: "object", label: "The translated GIF" },
    ...gifFields("data"),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown>("/gifs/translate", {
      query: { s: input.s, rating: input.rating, weirdness: input.weirdness },
    });
    return { data: body.data };
  },
};

export default translateGif;
