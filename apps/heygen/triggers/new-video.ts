import { pollFromListAction } from "../../_shared/poll/mod.ts";
import videoList from "../actions/video-list.ts";

export default pollFromListAction({
  key: "new-video",
  title: "New Video",
  description: "The run gets each newly created HeyGen video.",
  action: videoList,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) =>
    String(
      (item as { video_id?: unknown; id?: unknown }).video_id ?? (item as { id?: unknown }).id ??
        "",
    ),
  output: [{ key: "video_id", type: "string", label: "Video ID" }],
  sample: { video_id: "video-1", created_at: 1 },
  maxPages: 1,
});
