import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import postList from "../actions/post-list.ts";

type PostListInput = Parameters<NonNullable<typeof postList.execute>>[0];

function idOf(item: unknown): string {
  const id = (item as { id?: unknown }).id;
  if (id === undefined || id === null) throw new Error("Reddit post has no stable id");
  return String(id);
}

export default pollFromListAction<PostListInput>({
  key: "new-post",
  title: "New Post",
  description: "The run gets each post newly returned by List Subreddit Posts.",
  action: postList as unknown as ActionDefinition,
  input: (params) => ({ ...params, sort: "new", limit: 100 }),
  items: (result) => ((result as { posts?: unknown[] }).posts ?? []),
  idOf,
  params: postList.params,
  output: [{ key: "id", type: "string", label: "Post ID" }],
  sample: { id: "post_1" },
  maxPages: 1,
});
