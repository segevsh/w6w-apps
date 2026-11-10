import { pollFromListAction } from "../../_shared/poll/mod.ts";
import mediaList from "../actions/media-list.ts";

export default pollFromListAction({
  key: "new-media",
  title: "New Media",
  description: "The run gets each newly created media item.",
  action: mediaList,
  input: () => ({ sortBy: "created", sortDirection: "0", page: 1, perPage: 100 }),
  items: (r) => (r as { items?: unknown[] }).items ?? [],
  idOf: (i) =>
    String(
      (i as { hashed_id?: unknown; id?: unknown }).hashed_id ?? (i as { id?: unknown }).id ?? "",
    ),
  output: [{ key: "hashed_id", type: "string", label: "Media ID" }],
  sample: { hashed_id: "sample-id" },
  maxPages: 1,
});
