import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import listNewStories from "../actions/list-new-stories.ts";

export default pollFromListAction({
  key: "new-story",
  title: "New Story",
  description: "The run gets each newly submitted Hacker News story.",
  action: listNewStories as unknown as ActionDefinition,
  input: () => ({}),
  items: (result) => ((result as { ids?: number[] }).ids ?? []).map((id) => ({ id })),
  idOf: (item) => String((item as { id: number }).id),
  output: [{ key: "id", type: "number", label: "Story ID" }],
  sample: { id: 8863 },
  maxPages: 1,
});
