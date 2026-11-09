import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postList from "../actions/post-list.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description:
    "The run gets each newly created Canny feedback post across the workspace (sorted newest first).",
  action: postList,
  input: () => ({ sort: "newest", limit: 100 }),
  items: (r) => (r as { posts?: unknown[] }).posts ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "created", type: "string", label: "Created at" },
  ],
  sample: {
    id: "5f3a1b2c3d4e5f6a7b8c9d0e",
    title: "Dark mode",
    status: "open",
    created: "2026-11-09T09:00:00.000Z",
  },
  maxPages: 1,
});
