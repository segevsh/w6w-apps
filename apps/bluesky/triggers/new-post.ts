import { pollFromListAction } from "../../_shared/poll/mod.ts";
import postSearch from "../actions/post-search.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "The run gets each new post matching the search query.",
  action: postSearch,
  params: [
    { key: "query", label: "Query", type: "string", required: true },
    { key: "author", label: "From", type: "string" },
  ],
  input: (params: { query: string; author?: string }) => ({
    q: params.query,
    author: params.author,
    sort: "latest",
    limit: 100,
  }),
  items: (result) => (result as { posts?: unknown[] }).posts ?? [],
  idOf: (item) => String((item as { uri?: unknown }).uri ?? ""),
  output: [{ key: "uri", type: "string", label: "Post URI" }],
  sample: { uri: "at://did:plc:alice/app.bsky.feed.post/3new" },
  maxPages: 1,
});
