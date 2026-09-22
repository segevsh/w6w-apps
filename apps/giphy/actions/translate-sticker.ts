import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, ratingParam, weirdnessParam } from "../lib/params.ts";

/**
 * `GET /v1/stickers/translate` — turn a phrase into the single best sticker.
 *
 * The sticker counterpart of `translate-gif`: same required phrase, same single
 * object in `data`.
 */
interface Input {
  s: string;
  rating?: string;
  weirdness?: number;
}

const translateSticker: ActionDefinition<Input> = {
  key: "translate-sticker",
  type: "read",
  title: "Translate to Sticker",
  description:
    "Translate a phrase into the single sticker GIPHY thinks best matches it. Returns one object.",
  resource: "sticker",
  params: [
    {
      key: "s",
      label: "Phrase",
      type: "string",
      required: true,
      placeholder: "thank you",
      hint: "The phrase to translate. Plain text — do not URL-encode it.",
    },
    ratingParam,
    weirdnessParam,
  ],
  output: [
    { key: "data", type: "object", label: "The translated sticker" },
    ...gifFields("data"),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown>("/stickers/translate", {
      query: { s: input.s, rating: input.rating, weirdness: input.weirdness },
    });
    return { data: body.data };
  },
};

export default translateSticker;
