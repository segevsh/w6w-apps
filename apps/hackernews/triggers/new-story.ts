import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listNewStories from "../actions/list-new-stories.ts";

export default pollFromListAction({
  key: "new-story",
  title: "New Story",
  description: "The run gets each newly submitted Hacker News story.",
  action: listNewStories as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => (result as { ids?: unknown[] }).ids ?? [],
  idOf: (item) => String(item),
  output: [{ key: "id", type: "number", label: "Story ID" }],
  sample: 8863,
  maxPages: 1,
});
