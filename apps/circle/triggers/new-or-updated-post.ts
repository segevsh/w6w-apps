import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postList from "../actions/post-list.ts";
import { records } from "../lib/triggers.ts";

export default pollFromListAction({
  key: "new-or-updated-post",
  title: "New or Updated Post",
  description:
    "The run gets each post that is created or edited (GET /posts with sort=latest_updated, most recently updated first).",
  action: postList,
  // `latest_updated` is a documented value of the `sort` enum on GET /posts.
  input: () => ({ sort: "latest_updated", page: 1, perPage: 100 }),
  items: records,
  idOf: (v) => {
    const p = v as { id?: unknown; updated_at?: unknown };
    return `${p.id}:${p.updated_at ?? ""}`;
  },
  output: [
    { key: "id", type: "number", label: "Post ID" },
    { key: "name", type: "string", label: "Title" },
    { key: "status", type: "string", label: "Status" },
    { key: "space_id", type: "number", label: "Space ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 2,
    name: "Second post",
    status: "published",
    space_id: 1,
    created_at: "2026-11-09T08:31:30.781Z",
    updated_at: "2026-11-10T10:00:00.000Z",
  },
  maxPages: 1,
});
