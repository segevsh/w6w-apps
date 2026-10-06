import type { ActionDefinition } from "@w6w/types";
import { compact, requireText, SupadataClient, toList } from "../lib/client.ts";

interface Input {
  query: string;
  type?: string;
  uploadDate?: string;
  duration?: string;
  sortBy?: string;
  features?: string[] | string;
  limit?: number;
  nextPageToken?: string;
}

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v }));

const youtubeSearch: ActionDefinition<Input> = {
  key: "youtube-search",
  type: "search",
  resource: "youtube",
  title: "Search YouTube",
  description: "Search YouTube for videos, channels and playlists with filters.",
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    {
      key: "type",
      label: "Result type",
      type: "select",
      options: opts(["all", "video", "channel", "playlist", "movie"]),
    },
    {
      key: "uploadDate",
      label: "Uploaded",
      type: "select",
      options: opts(["all", "hour", "today", "week", "month", "year"]),
    },
    {
      key: "duration",
      label: "Duration",
      type: "select",
      options: opts(["all", "short", "medium", "long"]),
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: opts(["relevance", "rating", "date", "views"]),
    },
    {
      key: "features",
      label: "Features",
      type: "multiselect",
      hint: "Videos and movies only.",
      options: opts([
        "hd",
        "subtitles",
        "creative-commons",
        "3d",
        "live",
        "4k",
        "360",
        "location",
        "hdr",
        "vr180",
      ]),
    },
    {
      key: "limit",
      label: "Max results",
      type: "number",
      validation: { integer: true, min: 1, max: 5000 },
    },
    {
      key: "nextPageToken",
      label: "Next page token",
      type: "string",
      hint: "From a previous result.",
    },
  ],
  output: [
    { key: "query", type: "string", label: "Query" },
    { key: "results", type: "array", label: "Videos, channels and playlists" },
    { key: "totalResults", type: "number", label: "Total matches" },
    { key: "nextPageToken", type: "string", label: "Token for the next page" },
  ],

  async execute(input, ctx) {
    return await new SupadataClient(ctx).json("/youtube/search", {
      query: {
        ...compact({
          query: requireText(input.query, "Query"),
          type: input.type,
          uploadDate: input.uploadDate,
          duration: input.duration,
          sortBy: input.sortBy,
          limit: input.limit,
          nextPageToken: input.nextPageToken?.trim(),
        }),
        features: toList(input.features),
      },
    });
  },
};

export default youtubeSearch;
