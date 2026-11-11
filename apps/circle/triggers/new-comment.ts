import { pollFromListAction } from "../../_shared/poll/mod.ts";
import commentList from "../actions/comment-list.ts";
import { idOf, records } from "../lib/triggers.ts";

export default pollFromListAction({
  key: "new-comment",
  title: "New Comment",
  description:
    "The run gets each new comment (GET /comments lists comments in the community newest first).",
  action: commentList,
  // No sort argument exists: the spec documents "Lists comments in the community, newest first".
  input: () => ({ page: 1, perPage: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "parent_comment_id", type: "number", label: "Parent comment ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "body", type: "object", label: "Body" },
    { key: "user", type: "object", label: "Author" },
    { key: "post", type: "object", label: "Post" },
    { key: "space", type: "object", label: "Space" },
  ],
  sample: {
    id: 2,
    parent_comment_id: null,
    created_at: "2026-11-09T06:55:07.879Z",
    body: { body: "Second comment" },
    user: { id: 2, name: "Sample Member", email: "member@example.com" },
    post: { id: 2, name: "First post" },
    space: { id: 1, name: "General" },
  },
  maxPages: 1,
});
