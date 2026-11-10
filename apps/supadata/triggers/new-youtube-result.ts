import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/youtube-search.ts";

export default pollFromListAction<{ query: string }>({
  key: "new-youtube-result",
  title: "New YouTube Result",
  description: "The run gets each newly published YouTube search result.",
  action: action as unknown as ActionDefinition,
  input: ({ query }) => ({ query, type: "video", sortBy: "date", limit: 100 }),
  params: (action.params ?? []).filter((p) => p.key === "query"),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; videoId?: unknown }).id ?? (item as { videoId?: unknown }).videoId ??
        "",
    ),
  output: [{ key: "id", type: "string", label: "YouTube result ID" }],
  sample: { id: "video_101", publishedAt: "2026-11-09T00:00:00Z" },
  maxPages: 1,
});
