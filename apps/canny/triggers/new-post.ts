import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postList from "../actions/post-list.ts";
export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "The run gets each newly created Canny post.",
  action: postList,
  input: () => ({ sort: "newest", limit: 100, skip: 0 }),
  items: (r) => (r as { posts?: unknown[] }).posts ?? [],
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Post ID" }],
  sample: { id: "post-1" },
  maxPages: 1,
});
