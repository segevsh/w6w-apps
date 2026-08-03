import type { ActionDefinition } from "@w6w/types";
import { csv, partParam, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  id?: string | string[];
  chart?: string;
  myRating?: string;
  maxResults?: number;
  pageToken?: string;
  regionCode?: string;
  videoCategoryId?: string;
  hl?: string;
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * `videos.list` — GET /youtube/v3/videos
 * https://developers.google.com/youtube/v3/docs/videos/list
 *
 * **Quota: 1 unit**, from the shared 10,000/day bucket. This is the cheap way to
 * get full video detail, and the reason `search` should be used only to *find*
 * ids: up to 50 ids can be fetched in one call here for a single unit.
 *
 * The API requires exactly one filter — `id`, `chart` or `myRating` — and
 * rejects a request with none or several. That is enforced here so the failure
 * names the actual problem instead of arriving as a generic 400.
 *
 * `part` earns its keep on this endpoint more than anywhere else: `statistics`
 * (views, likes, comments), `contentDetails` (duration, definition) and `status`
 * (privacy, licence) are each a separate part, and none is returned unless asked
 * for.
 */
const getVideos: ActionDefinition<Input> = {
  key: "get-videos",
  type: "read",
  resource: "video",
  title: "Get Videos",
  description:
    "Fetch full detail for up to 50 videos by ID, or list the most-popular chart, or the authenticated user's liked/disliked videos. Costs 1 quota unit regardless of how many IDs are requested.",
  params: [
    partParam(
      "video",
      "snippet,contentDetails,statistics",
      "Sections to return. `statistics` carries view/like/comment counts, `contentDetails` carries duration, `status` carries privacy — none are included unless named here.",
    ),
    {
      key: "id",
      label: "Video IDs",
      type: "multiselect",
      hint: "Up to 50 video IDs. One of Video IDs, Chart or My rating is required.",
    },
    {
      key: "chart",
      label: "Chart",
      type: "select",
      options: [{ value: "mostPopular", label: "Most popular" }],
      hint: "Pairs with Region code and Video category ID.",
    },
    {
      key: "myRating",
      label: "My rating",
      type: "select",
      options: [
        { value: "like", label: "Liked" },
        { value: "dislike", label: "Disliked" },
      ],
      hint: "Requires an OAuth connection — an API key has no 'me'.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "1–50. Google's default is 5. Ignored when Video IDs is set.",
      validation: { integer: true, min: 1, max: 50 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
    {
      key: "regionCode",
      label: "Region code",
      type: "string",
      hint: "ISO 3166-1 alpha-2. Only used with Chart.",
    },
    {
      key: "videoCategoryId",
      label: "Video category ID",
      type: "string",
      hint: "Only used with Chart.",
    },
    {
      key: "hl",
      label: "Localisation language",
      type: "string",
      hint: "BCP-47 code, e.g. `de`. Returns localised titles/descriptions where available.",
    },
    {
      key: "maxWidth",
      label: "Player max width",
      type: "number",
      hint: "72–8192. Only affects the `player` part's embed HTML.",
      validation: { integer: true, min: 72, max: 8192 },
    },
    {
      key: "maxHeight",
      label: "Player max height",
      type: "number",
      hint: "72–8192. Only affects the `player` part's embed HTML.",
      validation: { integer: true, min: 72, max: 8192 },
    },
  ],
  output: [
    { key: "items", type: "array", label: "Videos" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "pageInfo", type: "object", label: "Page info" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const id = csv(input.id);
    // Exactly one filter, per the API's own contract.
    const filters = [id, input.chart, input.myRating].filter(Boolean);
    if (filters.length !== 1) {
      throw new Error(
        "get-videos: supply exactly one of `id`, `chart` or `myRating` — the API rejects zero or several",
      );
    }

    const client = new YouTubeClient(ctx);
    return client.request("/videos", {
      part: input.part,
      query: {
        id,
        chart: input.chart,
        myRating: input.myRating,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        regionCode: input.regionCode,
        videoCategoryId: input.videoCategoryId,
        hl: input.hl,
        maxWidth: input.maxWidth,
        maxHeight: input.maxHeight,
      },
    });
  },
};

export default getVideos;
