import type { ActionDefinition } from "@w6w/types";
import { csv, partParam, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  q?: string;
  type?: string | string[];
  channelId?: string;
  channelType?: string;
  eventType?: string;
  order?: string;
  maxResults?: number;
  pageToken?: string;
  publishedAfter?: string;
  publishedBefore?: string;
  regionCode?: string;
  relevanceLanguage?: string;
  safeSearch?: string;
  topicId?: string;
  videoCategoryId?: string;
  videoDuration?: string;
  videoDefinition?: string;
  videoCaption?: string;
  videoEmbeddable?: string;
  videoLicense?: string;
  videoType?: string;
  forMine?: boolean;
}

/**
 * `search.list` — GET /youtube/v3/search
 * https://developers.google.com/youtube/v3/docs/search/list
 *
 * **Quota: 1 unit, but capped at 100 calls/day in its own bucket.** Search does
 * not draw on the shared 10,000-unit allowance at all under the current model
 * (the widely-quoted "100 units per search" is the superseded one) — but 100
 * calls a day is a much tighter ceiling than a unit budget implies, and each
 * extra page of results is another call against it. Prefer `get-videos`,
 * `list-playlist-items` or `list-playlists` when you already know the ids: those
 * cost 1 unit from the large shared bucket and are effectively unlimited by
 * comparison.
 *
 * A search result is a *pointer*, not a resource: `part=snippet` returns titles
 * and thumbnails but no statistics, duration or status. To get those, take the
 * returned ids and call `get-videos`.
 */
const search: ActionDefinition<Input> = {
  key: "search",
  type: "search",
  resource: "searchResult",
  title: "Search",
  description:
    "Search YouTube for videos, channels and playlists. Costs 1 quota unit but is limited to 100 calls per day in a separate bucket, and each page is another call. Returns pointers — use Get Videos to fetch full video detail.",
  params: [
    partParam(
      "searchResult",
      "snippet",
      "`snippet` returns titles, descriptions and thumbnails; `id` returns bare resource ids. Search results carry no other parts.",
    ),
    {
      key: "q",
      label: "Query",
      type: "string",
      hint:
        "Supports the NOT (`-`) and OR (`|`) operators, e.g. `boating|sailing -fishing`. Omit to browse by filter alone.",
    },
    {
      key: "type",
      label: "Resource types",
      type: "multiselect",
      default: "video",
      options: [
        { value: "video", label: "Video" },
        { value: "channel", label: "Channel" },
        { value: "playlist", label: "Playlist" },
      ],
      hint:
        "Google's default is all three. Every `video*` filter below requires this to be exactly `video`.",
    },
    { key: "channelId", label: "Channel ID", type: "string", hint: "Restrict to one channel." },
    {
      key: "channelType",
      label: "Channel type",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "show", label: "Show" },
      ],
    },
    {
      key: "eventType",
      label: "Event type",
      type: "select",
      options: [
        { value: "live", label: "Live now" },
        { value: "upcoming", label: "Upcoming" },
        { value: "completed", label: "Completed" },
        { value: "none", label: "None" },
      ],
      hint: "Requires resource type `video`.",
    },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "relevance", label: "Relevance" },
        { value: "date", label: "Date" },
        { value: "rating", label: "Rating" },
        { value: "title", label: "Title" },
        { value: "videoCount", label: "Video count" },
        { value: "viewCount", label: "View count" },
      ],
      hint: "Google's default is `relevance`.",
    },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "0–50. Google's default is 5.",
      validation: { integer: true, min: 0, max: 50 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
    {
      key: "publishedAfter",
      label: "Published after (RFC 3339)",
      type: "datetime",
    },
    {
      key: "publishedBefore",
      label: "Published before (RFC 3339)",
      type: "datetime",
    },
    {
      key: "regionCode",
      label: "Region code",
      type: "string",
      hint: "ISO 3166-1 alpha-2, e.g. `US`.",
    },
    {
      key: "relevanceLanguage",
      label: "Relevance language",
      type: "string",
      hint: "ISO 639-1 two-letter code, e.g. `en`.",
    },
    {
      key: "safeSearch",
      label: "Safe search",
      type: "select",
      options: [
        { value: "none", label: "None" },
        { value: "moderate", label: "Moderate" },
        { value: "strict", label: "Strict" },
      ],
    },
    { key: "topicId", label: "Topic ID", type: "string", hint: "A Freebase topic id." },
    {
      key: "videoCategoryId",
      label: "Video category ID",
      type: "string",
      hint: "Requires resource type `video`.",
    },
    {
      key: "videoDuration",
      label: "Video duration",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "short", label: "Short (< 4 min)" },
        { value: "medium", label: "Medium (4–20 min)" },
        { value: "long", label: "Long (> 20 min)" },
      ],
      hint: "Requires resource type `video`.",
    },
    {
      key: "videoDefinition",
      label: "Video definition",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "standard", label: "Standard" },
        { value: "high", label: "High" },
      ],
      hint: "Requires resource type `video`.",
    },
    {
      key: "videoCaption",
      label: "Video caption",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "closedCaption", label: "Has closed captions" },
        { value: "none", label: "No closed captions" },
      ],
      hint: "Requires resource type `video`.",
    },
    {
      key: "videoEmbeddable",
      label: "Embeddable only",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "true", label: "Embeddable only" },
      ],
      hint: "Requires resource type `video`.",
    },
    {
      key: "videoLicense",
      label: "Video licence",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "youtube", label: "Standard YouTube licence" },
        { value: "creativeCommon", label: "Creative Commons" },
      ],
      hint: "Requires resource type `video`.",
    },
    {
      key: "videoType",
      label: "Video type",
      type: "select",
      options: [
        { value: "any", label: "Any" },
        { value: "movie", label: "Movie" },
        { value: "episode", label: "Episode" },
      ],
      hint: "Requires resource type `video`.",
    },
    {
      key: "forMine",
      label: "Only my videos",
      type: "boolean",
      hint:
        "Restrict to the authenticated user's own videos. Requires resource type `video` and an OAuth connection — an API key has no 'me'.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Search results" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "prevPageToken", type: "string", label: "Previous page token" },
    { key: "pageInfo", type: "object", label: "Page info" },
    { key: "regionCode", type: "string", label: "Region code" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const client = new YouTubeClient(ctx);
    return client.request("/search", {
      part: input.part,
      query: {
        q: input.q,
        type: csv(input.type),
        channelId: input.channelId,
        channelType: input.channelType,
        eventType: input.eventType,
        order: input.order,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        publishedAfter: input.publishedAfter,
        publishedBefore: input.publishedBefore,
        regionCode: input.regionCode,
        relevanceLanguage: input.relevanceLanguage,
        safeSearch: input.safeSearch,
        topicId: input.topicId,
        videoCategoryId: input.videoCategoryId,
        videoDuration: input.videoDuration,
        videoDefinition: input.videoDefinition,
        videoCaption: input.videoCaption,
        videoEmbeddable: input.videoEmbeddable,
        videoLicense: input.videoLicense,
        videoType: input.videoType,
        forMine: input.forMine,
      },
    });
  },
};

export default search;
