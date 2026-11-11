import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postList from "../actions/post-list.ts";
import { idOf, records } from "../lib/triggers.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description:
    "The run gets each newly created published post (GET /posts with sort=latest, newest first).",
  action: postList,
  // `latest` is a documented value of the `sort` enum on GET /posts.
  input: () => ({ sort: "latest", page: 1, perPage: 100 }),
  items: records,
  idOf,
  output: [
    { key: "id", type: "number", label: "Post ID" },
    { key: "name", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "space_id", type: "number", label: "Space ID" },
    { key: "user_email", type: "string", label: "Author email" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: 2,
    name: "Second post",
    status: "published",
    space_id: 1,
    user_email: "member@example.com",
    created_at: "2026-11-09T08:31:30.781Z",
  },
  maxPages: 1,
});
