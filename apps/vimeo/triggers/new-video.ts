import { pollFromListAction } from "../../_shared/poll/mod.ts";
import videoList from "../actions/video-list.ts";

export default pollFromListAction({
  key: "new-video",
  title: "New Video",
  description: "The run gets each newly uploaded video.",
  action: videoList,
  input: () => ({ sort: "date", direction: "desc", page: 1, perPage: 100 }),
  items: (r) => (r as { data?: unknown[] }).data ?? [],
  idOf: (i) =>
    String((i as { uri?: unknown; id?: unknown }).uri ?? (i as { id?: unknown }).id ?? ""),
  output: [{ key: "uri", type: "string", label: "Video URI" }],
  sample: { uri: "/videos/sample-id" },
  maxPages: 1,
});
