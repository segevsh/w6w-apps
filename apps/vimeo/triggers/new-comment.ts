import { pollFromListAction } from "../../_shared/poll/mod.ts";
import commentList from "../actions/comment-list.ts";

/**
 * `GET /videos/{video}/comments` takes `direction=desc` (newest first), per
 * https://developer.vimeo.com/api/reference/videos (2026-11-10).
 */
export default pollFromListAction({
  key: "new-comment",
  title: "New Comment",
  description: "The run gets each new top-level comment on the video.",
  action: commentList as never,
  params: [{
    key: "videoId",
    label: "Video ID",
    type: "string",
    required: true,
    placeholder: "258684937",
    hint: "The numeric video ID, or a full `/videos/258684937` URI.",
  }],
  input: (p) => ({ videoId: p.videoId, direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) => String((i as { uri?: unknown }).uri ?? ""),
  output: [
    { key: "uri", type: "string", label: "Comment URI" },
    { key: "text", type: "string", label: "Text" },
    { key: "created_on", type: "string", label: "Created" },
    { key: "user", type: "object", label: "Author" },
  ],
  sample: {
    uri: "/videos/258684937/comments/987",
    text: "Great cut!",
    created_on: "2026-11-09T12:00:00+00:00",
    user: { name: "Jane" },
  },
  maxPages: 1,
});
