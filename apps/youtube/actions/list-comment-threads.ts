import type { ActionDefinition } from "@w6w/types";
import { csv, partParam, YouTubeClient } from "../lib/client.ts";

interface Input {
  part: string | string[];
  videoId?: string;
  channelId?: string;
  allThreadsRelatedToChannelId?: string;
  id?: string | string[];
  maxResults?: number;
  pageToken?: string;
  order?: string;
  searchTerms?: string;
  moderationStatus?: string;
  textFormat?: string;
}

/**
 * `commentThreads.list` — GET /youtube/v3/commentThreads
 * https://developers.google.com/youtube/v3/docs/commentThreads/list
 *
 * **Quota: 1 unit per page.**
 *
 * **Scope note:** the comment endpoints are the reason this app requests
 * `youtube.force-ssl` and not `youtube`. Per the discovery document,
 * `commentThreads.list` accepts `https://www.googleapis.com/auth/youtube.force-ssl`
 * and *nothing else* — a credential holding only `youtube` or `youtube.readonly`
 * cannot read comments at all.
 *
 * A thread is a top-level comment plus a page of replies. `part=replies` returns
 * at most the first few replies, not all of them — a thread with many replies
 * needs `comments.list` against the parent id to walk the rest, which this app
 * does not implement.
 *
 * Exactly one filter — `id`, `videoId`, `channelId` or
 * `allThreadsRelatedToChannelId`. Note the difference between the last two:
 * `channelId` returns comments *about the channel itself*, while
 * `allThreadsRelatedToChannelId` returns comments about the channel **and** all
 * of its videos, which is almost always the one you actually want.
 */
const listCommentThreads: ActionDefinition<Input> = {
  key: "list-comment-threads",
  type: "read",
  resource: "commentThread",
  title: "List Comment Threads",
  description:
    "List comment threads on a video or channel. Costs 1 quota unit per page. Requires the youtube.force-ssl scope — no other scope can read comments.",
  params: [
    partParam(
      "commentThread",
      "snippet,replies",
      "Sections to return. `snippet` carries the top-level comment; `replies` carries only the first page of replies, not all of them.",
    ),
    { key: "videoId", label: "Video ID", type: "string", hint: "Threads on one video." },
    {
      key: "channelId",
      label: "Channel ID",
      type: "string",
      hint: "Threads about the channel itself — NOT its videos.",
    },
    {
      key: "allThreadsRelatedToChannelId",
      label: "All threads for channel ID",
      type: "string",
      hint: "Threads about the channel AND all of its videos. Usually the one you want.",
    },
    { key: "id", label: "Thread IDs", type: "multiselect", hint: "Fetch specific threads by ID." },
    {
      key: "maxResults",
      label: "Max results",
      type: "number",
      hint: "1–100. Google's default is 20.",
      validation: { integer: true, min: 1, max: 100 },
    },
    { key: "pageToken", label: "Page token", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "time", label: "Time (newest first)" },
        { value: "relevance", label: "Relevance" },
      ],
      hint: "Google's default is `time`.",
    },
    {
      key: "searchTerms",
      label: "Search terms",
      type: "string",
      hint: "Restrict to threads matching these terms.",
    },
    {
      key: "moderationStatus",
      label: "Moderation status",
      type: "select",
      options: [
        { value: "published", label: "Published" },
        { value: "heldForReview", label: "Held for review" },
        { value: "likelySpam", label: "Likely spam" },
        { value: "rejected", label: "Rejected" },
      ],
      hint:
        "Google's default is `published`. Anything else requires the authenticated user to own the channel being moderated.",
    },
    {
      key: "textFormat",
      label: "Text format",
      type: "select",
      options: [
        { value: "html", label: "HTML" },
        { value: "plainText", label: "Plain text" },
      ],
      hint: "Google's default is `html`.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Comment threads" },
    { key: "nextPageToken", type: "string", label: "Next page token" },
    { key: "pageInfo", type: "object", label: "Page info" },
    { key: "kind", type: "string", label: "Resource kind" },
  ],

  execute(input, ctx) {
    const id = csv(input.id);
    const filters = [
      id,
      input.videoId,
      input.channelId,
      input.allThreadsRelatedToChannelId,
    ].filter(Boolean);
    if (filters.length !== 1) {
      throw new Error(
        "list-comment-threads: supply exactly one of `id`, `videoId`, `channelId` or `allThreadsRelatedToChannelId` — the API rejects zero or several",
      );
    }

    const client = new YouTubeClient(ctx);
    return client.request("/commentThreads", {
      part: input.part,
      query: {
        id,
        videoId: input.videoId,
        channelId: input.channelId,
        allThreadsRelatedToChannelId: input.allThreadsRelatedToChannelId,
        maxResults: input.maxResults,
        pageToken: input.pageToken,
        order: input.order,
        searchTerms: input.searchTerms,
        moderationStatus: input.moderationStatus,
        textFormat: input.textFormat,
      },
    });
  },
};

export default listCommentThreads;
