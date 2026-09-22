import type { ActionDefinition } from "@w6w/types";
import { encodeId, GiphyClient } from "../lib/client.ts";
import { gifFields, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/gifs/{gif_id}` — one GIF by its id.
 *
 * ## A missing id is an answer, not an error
 *
 * GIPHY documents `404 Not Found` when the id does not exist, and it says so in
 * the body's `meta.status` with an empty `data`. That is information: the
 * lookup ran and the id is unknown. So this action accepts a non-200
 * `meta.status` instead of throwing, and returns GIPHY's `meta` alongside the
 * data — `meta.status` is how a caller tells "no such id" from "here it is".
 * Every other action in this app throws on a non-200, because there a non-200
 * really is a failure of the request rather than of the lookup.
 *
 * ## The id is path-escaped
 *
 * The id is interpolated into the path, so it is percent-encoded first. GIPHY
 * ids are letters, digits, `-` and `_`, which encoding leaves alone — but a
 * pasted `/` or `?` would otherwise be able to redefine the request path.
 */
interface Input {
  gifId: string;
  rating?: string;
}

const getGifById: ActionDefinition<Input> = {
  key: "get-gif-by-id",
  type: "read",
  title: "Get GIF by ID",
  description:
    "Fetch one GIF by its GIPHY id. An unknown id is reported in `meta.status` with an empty " +
    "`data`, not as a failed step.",
  resource: "gif",
  params: [
    {
      key: "gifId",
      label: "GIF ID",
      type: "string",
      required: true,
      placeholder: "3o7btPCcdNniyf0ArS",
      hint: "The id from a GIPHY page URL (the final path segment) or from another action's " +
        "`data[].id`.",
    },
    ratingParam,
  ],
  output: [
    { key: "data", type: "object", label: "The GIF, or an empty array when the id is unknown" },
    ...gifFields("data"),
    { key: "meta.status", type: "number", label: "GIPHY status — 200, or 404 for an unknown id" },
    { key: "meta.msg", type: "string", label: "GIPHY message" },
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown>(
      `/gifs/${encodeId(input.gifId)}`,
      {
        query: { rating: input.rating },
        // 404 is GIPHY answering the question, not a failure to ask it.
        acceptMetaStatuses: [404],
      },
    );
    return { data: body.data, meta: body.meta };
  },
};

export default getGifById;
