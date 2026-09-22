import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, limitParam, offsetParam, paginationField, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/gifs/search` — search GIPHY's GIF library for a phrase.
 *
 * `q` is required and capped at 50 characters, and that cap is a hard response
 * code rather than a guideline: GIPHY documents `414 URI Too Long` for a longer
 * query, so the limit is enforced on the form as well.
 *
 * `limit` is GIPHY's documented default of 25; beta keys are capped at 50, and
 * the hint says so rather than enforcing a ceiling a production key would not
 * have.
 *
 * Results are a `data` array with a `pagination` object alongside it — GIPHY's
 * own envelope, passed through rather than reshaped.
 */
interface Input {
  q: string;
  limit?: number;
  offset?: number;
  rating?: string;
  lang?: string;
}

const searchGifs: ActionDefinition<Input> = {
  key: "search-gifs",
  type: "search",
  title: "Search GIFs",
  description:
    "Search GIPHY's GIF library for a phrase. Returns matching GIFs plus GIPHY's pagination " +
    "object.",
  resource: "gif",
  params: [
    {
      key: "q",
      label: "Query",
      type: "string",
      required: true,
      placeholder: "happy dance",
      validation: { maxLength: 50 },
      hint:
        "Plain text — do not URL-encode it. GIPHY documents 414 URI Too Long for a query over " +
        "50 characters, so the limit is enforced here too.",
    },
    limitParam(25),
    offsetParam,
    ratingParam,
    {
      key: "lang",
      label: "Language",
      type: "string",
      advanced: true,
      placeholder: "en",
      hint: "A language code for regional results, or a locale such as `en_US`. Unset, GIPHY " +
        "applies its own default.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Matching GIFs" },
    ...gifFields("data[]"),
    paginationField(),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown[]>("/gifs/search", {
      query: {
        q: input.q,
        limit: input.limit,
        offset: input.offset,
        rating: input.rating,
        lang: input.lang,
      },
    });
    return { data: body.data ?? [], pagination: body.pagination };
  },
};

export default searchGifs;
