import postGetAll from "../actions/post-get-all.ts";
import { pollFromListAction } from "../../_shared/poll/mod.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "The run gets each newly published WordPress post.",
  action: postGetAll,
  input: () => ({ orderBy: "date", order: "desc", perPage: 100, page: 1, status: "publish" }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "number", label: "Post ID" }],
  sample: { id: 1, title: { rendered: "A new post" } },
  maxPages: 1,
});
