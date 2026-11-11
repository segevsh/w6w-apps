import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listComments from "../actions/list-comments.ts";

/**
 * `GET /{ig-media-id}/comments` returns top-level comments newest first, at most 50 per page
 * (https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-media/comments,
 * verified 2026-11-10), so page 1 is the feed.
 */
export default pollFromListAction({
  key: "new-comment",
  title: "New Comment",
  description: "The run gets each new top-level comment on the chosen Instagram post.",
  action: listComments as unknown as ActionDefinition,
  input: (params: { mediaId: string }) => ({ mediaId: params.mediaId, limit: 50 }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  params: [{
    key: "mediaId",
    label: "Media ID",
    type: "string",
    required: true,
    hint: "The post whose comments to watch (an id from List Media).",
  }],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "timestamp", type: "string", label: "Posted at" },
    { key: "username", type: "string", label: "Username" },
    { key: "like_count", type: "number", label: "Like count" },
    { key: "hidden", type: "boolean", label: "Hidden" },
  ],
  sample: {
    id: "17858893269000001",
    text: "Love this!",
    timestamp: "2026-11-10T09:00:00+0000",
    username: "sample_user",
    like_count: 0,
    hidden: false,
  },
  maxPages: 1,
});
