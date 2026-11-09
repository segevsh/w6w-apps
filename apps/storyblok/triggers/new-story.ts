import { pollFromListAction } from "../../_shared/poll/mod.ts";
import storyList from "../actions/story-list.ts";

export default pollFromListAction({
  key: "new-story",
  title: "New Story",
  description: "Polls the newest Storyblok stories from story-list.",
  action: storyList,
  input: (params) => ({ ...params, sortBy: "first_published_at:desc", page: 1, perPage: 100 }),
  items: (result) => (result as { stories?: unknown[] }).stories ?? [],
  idOf: (item) =>
    String((item as { uuid?: string; id: number }).uuid ?? (item as { id: number }).id),
  params: storyList.params,
  output: [{ key: "uuid", type: "string", label: "Story UUID" }],
  sample: { id: 123, uuid: "story-123", full_slug: "blog/hello" },
  maxPages: 1,
});
