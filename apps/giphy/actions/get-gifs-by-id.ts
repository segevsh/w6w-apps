import type { ActionDefinition } from "@w6w/types";
import { GiphyClient } from "../lib/client.ts";
import { gifFields, paginationField, ratingParam } from "../lib/params.ts";

/**
 * `GET /v1/gifs?ids=a,b,c` — several GIFs by id, in one call.
 *
 * This is the collection endpoint, not a loop over `get-gif-by-id`: GIPHY
 * documents one request per id as the thing to avoid. `ids` is a single
 * comma-separated value (not a repeated parameter) capped at 100 ids, so the
 * 50-character query limit that applies to a *search phrase* does not apply
 * here.
 *
 * The ids are sent exactly as typed — trimmed and non-empty only. Re-ordering
 * or deduplicating them would change what the caller asked for.
 */
interface Input {
  ids: string;
  rating?: string;
}

const getGifsById: ActionDefinition<Input> = {
  key: "get-gifs-by-id",
  type: "read",
  title: "Get GIFs by ID",
  description:
    "Fetch up to 100 GIFs by their GIPHY ids in a single call. Pass the ids comma-separated.",
  resource: "gif",
  params: [
    {
      key: "ids",
      label: "GIF IDs",
      type: "string",
      required: true,
      placeholder: "3o7btPCcdNniyf0ArS,26u4lOMA8JKSnL9Uk",
      hint: "Comma-separated, up to 100 ids. Sent as one parameter value, exactly as typed.",
    },
    ratingParam,
  ],
  output: [
    { key: "data", type: "array", label: "The requested GIFs" },
    ...gifFields("data[]"),
    paginationField(),
  ],

  async execute(input, ctx) {
    const body = await new GiphyClient(ctx).envelope<unknown[]>("/gifs", {
      query: { ids: input.ids, rating: input.rating },
    });
    return { data: body.data ?? [], pagination: body.pagination };
  },
};

export default getGifsById;
